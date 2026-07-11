// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import useFireExtinguisherSessionSync from '../form/hooks/useFireExtinguisherSessionSync'
import {
  countFireExtinguisherSessionRetryQueue,
  enqueueFireExtinguisherSessionRetry,
  loadFireExtinguisherSessionRetryQueue,
  retryFireExtinguisherSessionQueue,
} from '../form/hooks/fireExtinguisherSessionRetryQueue'

const sessionApiMock = vi.hoisted(() => ({
  createOrResumeInspectionSession: vi.fn(),
  fetchInspectionSession: vi.fn(),
  fetchInspectionSessionProgress: vi.fn(),
  fetchInspectionSessionResults: vi.fn(),
  completeInspectionSessionExtinguisher: vi.fn(),
  resetInspectionSessionExtinguisher: vi.fn(),
  getFireExtinguisherAssetKey: vi.fn((row = {}) => String(row.canonicalAssetKey || row.id || '')),
}))

const featureFlagsMock = vi.hoisted(() => ({
  inspectionSessionFireExtinguisherEnabled: true,
  inspectionSessionScopeV2Enabled: false,
}))

vi.mock('src/config/featureFlags', () => ({
  default: featureFlagsMock,
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
    featureFlagsMock.inspectionSessionScopeV2Enabled = false
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
    sessionApiMock.fetchInspectionSession.mockResolvedValue(null)
  })

  it('requests a server-derived V2 scope from the inspection date when enabled', async () => {
    featureFlagsMock.inspectionSessionScopeV2Enabled = true

    renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        inspectedAt: '2026-07-11T08:30',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        currentUserId: 'user-1',
      }),
    )

    await waitFor(() =>
      expect(sessionApiMock.createOrResumeInspectionSession).toHaveBeenCalledWith({
        inspectionType: 'Fire Extinguisher Inspection',
        forceNew: false,
        scope: { scopeVersion: 'v2', inspectionDate: '2026-07-11' },
      }),
    )
  })

  it('resumes an existing legacy or V2 form session before resolving a new scope', async () => {
    featureFlagsMock.inspectionSessionScopeV2Enabled = true
    sessionApiMock.fetchInspectionSession.mockResolvedValue({
      sessionUid: 'legacy-session-1',
      scopeVersion: 'legacy',
      results: [],
      progress: null,
    })

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        formInspectionSessionUid: 'legacy-session-1',
        inspectedAt: '2026-07-11T08:30',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        currentUserId: 'user-1',
      }),
    )

    await waitFor(() => expect(result.current.session?.sessionUid).toBe('legacy-session-1'))
    expect(sessionApiMock.fetchInspectionSession).toHaveBeenCalledWith({
      sessionUid: 'legacy-session-1',
    })
    expect(sessionApiMock.createOrResumeInspectionSession).not.toHaveBeenCalled()
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

    expect(saveResult).toEqual(
      expect.objectContaining({
        __queued: true,
        assetKey: 'catalog:fe-1',
        operationId: expect.stringMatching(/^fe-op:/),
      }),
    )
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

  it('reports an active sync until the server response and session version are applied', async () => {
    let resolveComplete
    let resolveProgress
    sessionApiMock.completeInspectionSessionExtinguisher.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveComplete = resolve
        }),
    )
    sessionApiMock.fetchInspectionSessionProgress.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProgress = resolve
        }),
    )

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        currentUserId: 'user-1',
      }),
    )
    await waitFor(() => expect(result.current.session?.sessionUid).toBe('session-1'))

    let completion
    act(() => {
      completion = result.current.completeRow(completeRow, { allowCompletedUpdate: true })
    })
    await waitFor(() => expect(result.current.activeSyncCount).toBe(1))

    await act(async () => {
      resolveComplete({
        row: {
          id: 'session-result-1',
          canonicalAssetKey: 'catalog:fe-1',
          status: 'completed',
          version: 1,
        },
        meta: { sessionVersion: 2 },
      })
      await completion
    })

    expect(result.current.activeSyncCount).toBe(0)
    expect(result.current.meta).toEqual({ sessionVersion: 2 })

    await act(async () => {
      resolveProgress({ sessionVersion: 1 })
      await Promise.resolve()
    })
    expect(result.current.meta).toEqual({ sessionVersion: 2 })
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

  it('preserves version conflicts for resolution instead of clearing or retrying them', async () => {
    const conflictError = new Error('This result changed since it was loaded.')
    conflictError.status = 409
    conflictError.payload = {
      code: 'inspection_result_version_conflict',
      data: {
        id: 'session-result-current',
        canonicalAssetKey: 'catalog:fe-1',
        status: 'completed',
        version: 4,
      },
    }
    sessionApiMock.completeInspectionSessionExtinguisher.mockRejectedValue(conflictError)

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        currentUserId: 'user-1',
      }),
    )
    await waitFor(() => expect(result.current.session?.sessionUid).toBe('session-1'))

    let saveResult
    await act(async () => {
      saveResult = await result.current.completeRow(completeRow, { allowCompletedUpdate: true })
    })

    expect(saveResult).toEqual(expect.objectContaining({ __conflict: true }))
    expect(
      loadFireExtinguisherSessionRetryQueue({
        userId: 'user-1',
        sessionUid: 'session-1',
      }),
    ).toEqual([
      expect.objectContaining({
        state: 'conflict',
        lastErrorCode: 'inspection_result_version_conflict',
      }),
    ])

    act(() => window.dispatchEvent(new Event('online')))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(sessionApiMock.completeInspectionSessionExtinguisher).toHaveBeenCalledTimes(1)
  })

  it('retries queued session rows from review across all user sessions', async () => {
    const rowWithPhoto = {
      ...completeRow,
      physicalConditionPhotos: [
        {
          id: 'photo-1',
          mediaId: 'rpm-photo-1',
          url: '/report-media/rpm-photo-1',
        },
      ],
    }
    enqueueFireExtinguisherSessionRetry({
      userId: 'user-1',
      sessionUid: 'session-a',
      row: rowWithPhoto,
      options: { baseVersion: 2, clientResultId: 'stable-client-result' },
      error: new Error('Network unavailable'),
    })
    sessionApiMock.completeInspectionSessionExtinguisher.mockResolvedValue({
      row: {
        id: 'session-result-1',
        canonicalAssetKey: 'catalog:fe-1',
        status: 'completed',
      },
      meta: null,
    })

    const results = await retryFireExtinguisherSessionQueue({ userId: 'user-1', force: true })

    expect(sessionApiMock.completeInspectionSessionExtinguisher).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionUid: 'session-a',
        row: rowWithPhoto,
        baseVersion: 2,
        operationId: expect.stringMatching(/^fe-op:/),
        clientResultId: expect.stringMatching(/^fe-op:/),
      }),
    )
    expect(results).toEqual([
      expect.objectContaining({
        sessionUid: 'session-a',
        assetKey: 'catalog:fe-1',
        synced: true,
      }),
    ])
    expect(
      countFireExtinguisherSessionRetryQueue({ userId: 'user-1', sessionUid: 'session-a' }),
    ).toBe(0)
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

  it('clears completed session decorations immediately while a reset request is pending', async () => {
    sessionApiMock.fetchInspectionSessionResults.mockResolvedValue({
      rows: [
        {
          id: 'session-result-1',
          canonicalAssetKey: 'catalog:fe-1',
          status: 'completed',
          checkedBy: 'Jang',
          checkedByUserId: 'user-1',
          checkedAt: '2026-07-11T00:00:00+08:00',
          version: 3,
          checkPayload: completeRow,
        },
      ],
      meta: null,
    })
    let rejectReset
    sessionApiMock.resetInspectionSessionExtinguisher.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectReset = reject
        }),
    )

    const { result } = renderHook(() =>
      useFireExtinguisherSessionSync({
        enabled: true,
        inspectionType: 'Fire Extinguisher Inspection',
        zone: 'Zone 1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        currentUserId: 'user-1',
      }),
    )

    await waitFor(() => expect(result.current.results).toHaveLength(1))

    let resetPromise
    act(() => {
      resetPromise = result.current.resetRow({
        ...completeRow,
        physicalCondition: '',
        signageCondition: '',
        boxKeyAvailability: '',
        boxGlassAvailability: '',
        operationalCondition: '',
      })
    })

    await waitFor(() => {
      const [merged] = result.current.mergeSessionStatus([completeRow])
      expect(merged).toMatchObject({
        physicalCondition: '',
        sessionResult: null,
        sessionStatus: '',
        sessionCheckedBy: '',
        sessionCheckedAt: null,
        sessionSyncPending: false,
      })
    })

    await act(async () => {
      rejectReset(new Error('Network unavailable'))
      await resetPromise
    })

    const [mergedAfterFailure] = result.current.mergeSessionStatus([completeRow])
    expect(mergedAfterFailure.physicalCondition).toBe('')
    expect(mergedAfterFailure.sessionStatus).toBe('')
    expect(
      loadFireExtinguisherSessionRetryQueue({
        userId: 'user-1',
        sessionUid: 'session-1',
      }),
    ).toEqual([
      expect.objectContaining({
        type: 'reset',
        assetKey: 'catalog:fe-1',
        state: 'retryable',
      }),
    ])
    expect(sessionApiMock.fetchInspectionSessionResults).toHaveBeenCalledTimes(1)
  })
})
