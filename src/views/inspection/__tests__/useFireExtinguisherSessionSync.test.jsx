// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import useFireExtinguisherSessionSync from '../form/hooks/useFireExtinguisherSessionSync'
import {
  countFireExtinguisherSessionRetryQueue,
  loadFireExtinguisherSessionRetryQueue,
} from '../form/hooks/fireExtinguisherSessionRetryQueue'

const sessionApiMock = vi.hoisted(() => ({
  createOrResumeInspectionSession: vi.fn(),
  fetchInspectionSessionProgress: vi.fn(),
  fetchInspectionSessionResults: vi.fn(),
  completeInspectionSessionExtinguisher: vi.fn(),
  resetInspectionSessionExtinguisher: vi.fn(),
  getFireExtinguisherAssetKey: vi.fn((row = {}) => String(row.canonicalAssetKey || row.id || '')),
}))

vi.mock('src/config/featureFlags', () => ({
  default: {
    inspectionSessionFireExtinguisherEnabled: true,
  },
}))

vi.mock('../domain/api/inspectionSessionApi', () => sessionApiMock)

const completeRow = {
  id: 'fe-1',
  canonicalAssetKey: 'catalog:fe-1',
  idLocNo: 'FE-001',
  physicalCondition: 'Good',
  signageCondition: 'Good',
  boxKeyAvailability: 'Yes',
  boxGlassAvailability: 'Yes',
  operationalCondition: 'Good',
}

const createStorageMock = () => {
  const rows = new Map()
  return {
    getItem: vi.fn((key) => (rows.has(key) ? rows.get(key) : null)),
    setItem: vi.fn((key, value) => rows.set(key, String(value))),
    removeItem: vi.fn((key) => rows.delete(key)),
    clear: vi.fn(() => rows.clear()),
    key: vi.fn((index) => Array.from(rows.keys())[index] || null),
    get length() {
      return rows.size
    },
  }
}

describe('useFireExtinguisherSessionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const localStorage = createStorageMock()
    vi.stubGlobal('localStorage', localStorage)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorage,
    })
    sessionApiMock.createOrResumeInspectionSession.mockResolvedValue({
      sessionUid: 'session-1',
      results: [],
      progress: null,
    })
    sessionApiMock.fetchInspectionSessionResults.mockResolvedValue({ rows: [], meta: null })
    sessionApiMock.fetchInspectionSessionProgress.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists failed extinguisher session completes and retries them automatically', async () => {
    const pushToast = vi.fn()
    const networkError = new Error('Network unavailable')
    sessionApiMock.completeInspectionSessionExtinguisher
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        row: {
          id: 'session-result-1',
          canonicalAssetKey: 'catalog:fe-1',
          status: 'completed',
        },
        meta: null,
      })

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        currentUserId: 'user-1',
        pushToast,
      }),
    )

    await waitFor(() => expect(result.current.session?.sessionUid).toBe('session-1'))

    let saveResult
    await act(async () => {
      saveResult = await result.current.completeRow(completeRow, { allowCompletedUpdate: true })
    })

    expect(saveResult).toEqual({ __queued: true, assetKey: 'catalog:fe-1' })
    expect(
      loadFireExtinguisherSessionRetryQueue({
        userId: 'user-1',
        sessionUid: 'session-1',
      }),
    ).toHaveLength(1)
    expect(pushToast).toHaveBeenCalledWith(
      'Saved on this device. Backend session sync will retry automatically.',
      expect.objectContaining({ title: 'Sync pending' }),
    )

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() =>
      expect(sessionApiMock.completeInspectionSessionExtinguisher).toHaveBeenCalledTimes(2),
    )
    await waitFor(() =>
      expect(
        loadFireExtinguisherSessionRetryQueue({
          userId: 'user-1',
          sessionUid: 'session-1',
        }),
      ).toHaveLength(0),
    )
  })

  it('counts pending retry rows across all sessions for the current user', () => {
    localStorage.setItem(
      'inspection_fe_session_complete_retry_v1_user-1_session-a',
      JSON.stringify([{ assetKey: 'catalog:1', row: { canonicalAssetKey: 'catalog:1' } }]),
    )
    localStorage.setItem(
      'inspection_fe_session_complete_retry_v1_user-1_session-b',
      JSON.stringify([{ assetKey: 'catalog:2', row: { canonicalAssetKey: 'catalog:2' } }]),
    )
    localStorage.setItem(
      'inspection_fe_session_complete_retry_v1_user-2_session-a',
      JSON.stringify([{ assetKey: 'catalog:3', row: { canonicalAssetKey: 'catalog:3' } }]),
    )

    expect(countFireExtinguisherSessionRetryQueue({ userId: 'user-1' })).toBe(2)
    expect(
      countFireExtinguisherSessionRetryQueue({ userId: 'user-1', sessionUid: 'session-a' }),
    ).toBe(1)
  })

  it("keeps another inspector's completed extinguisher interactive while preserving attribution", async () => {
    sessionApiMock.fetchInspectionSessionResults.mockResolvedValue({
      rows: [
        {
          id: 'session-result-1',
          canonicalAssetKey: 'catalog:fe-1',
          status: 'completed',
          checkedBy: 'Inspector A',
          checkedByUserId: 'user-1',
          checkedAt: '2026-07-10T21:56:00+08:00',
          version: 3,
          checkPayload: completeRow,
        },
      ],
      meta: null,
    })

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        currentUserId: 'user-2',
      }),
    )

    await waitFor(() => expect(result.current.results).toHaveLength(1))

    const [merged] = result.current.mergeSessionStatus([
      {
        id: 'fe-1',
        canonicalAssetKey: 'catalog:fe-1',
        idLocNo: 'FE-001',
      },
    ])

    expect(merged).toMatchObject({
      physicalCondition: 'Good',
      sessionCheckedBy: 'Inspector A',
      sessionStatus: 'completed',
    })
  })
})
