// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useClaimDraft from '../useClaimDraft'

vi.mock('src/services/payrollPrivacy', () => ({
  getPayrollVolatileStorage: () => ({
    getItem: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  }),
}))

vi.mock('src/services/payrollClaimsApi', () => ({
  enqueuePayrollDraftRetry: vi.fn(),
  sanitizePayrollDraftPayloadForStorage: (payload) => payload,
  saveMyPayrollClaimDraftApiFirst: vi.fn(),
}))

const buildProps = (overrides = {}) => ({
  hasHydratedDraftRef: { current: false },
  currentSnapshot: 'changed',
  initialSnapshot: 'initial',
  buildDraftPayload: vi.fn(() => ({ id: 'draft-1' })),
  buildSnapshot: vi.fn(() => 'changed'),
  activeDraftId: '',
  setActiveDraftId: vi.fn(),
  activeDraftBackendId: null,
  setActiveDraftBackendId: vi.fn(),
  localAutosaveKey: 'claim-draft-test',
  draftType: 'overtime',
  userId: 'user-1',
  savedItems: [],
  navGuardKey: 'claim-form-test',
  navGuardMessage: 'Unsaved changes',
  registerGuard: vi.fn(),
  unregisterGuard: vi.fn(),
  pushToast: vi.fn(),
  saveDraftSuccessMessage: 'Draft saved',
  suppressAutosave: true,
  ...overrides,
})

describe('useClaimDraft navigation protection', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('registers and removes beforeunload protection for dirty production drafts', () => {
    vi.stubEnv('PROD', true)
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useClaimDraft(buildProps()))

    const registration = addEventListener.mock.calls.find(([type]) => type === 'beforeunload')
    expect(registration).toBeTruthy()

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('beforeunload', registration[1])
  })

  it('does not register beforeunload protection in development', () => {
    vi.stubEnv('PROD', false)
    const addEventListener = vi.spyOn(window, 'addEventListener')

    renderHook(() => useClaimDraft(buildProps()))

    expect(addEventListener.mock.calls.some(([type]) => type === 'beforeunload')).toBe(false)
  })
})
