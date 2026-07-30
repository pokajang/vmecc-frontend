import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/config/featureFlags', () => ({
  default: {
    apiOtPayrollReadsPrimary: true,
    apiOtPayrollWritesPrimary: true,
  },
}))

const apiMocks = vi.hoisted(() => ({
  approveStaffOvertimeRecord: vi.fn(),
  cancelOvertimeRecord: vi.fn(),
  cancelStaffOvertimeRecord: vi.fn(),
  classifyOvertimeDateApi: vi.fn(),
  clearOvertimeDraftApi: vi.fn(),
  createOvertimeRecord: vi.fn(),
  deleteOvertimeRecordApi: vi.fn(),
  fetchOvertimeDraft: vi.fn(),
  fetchOvertimeEligibility: vi.fn(),
  fetchOvertimePolicy: vi.fn(),
  fetchOvertimeRecords: vi.fn(),
  fetchStaffOvertimeRecordByPublicId: vi.fn(),
  fetchStaffOvertimeRecords: vi.fn(),
  recommendStaffOvertimeRecord: vi.fn(),
  rejectStaffOvertimeRecord: vi.fn(),
  requestCorrectionStaffOvertimeRecord: vi.fn(),
  reviewStaffOvertimeRecord: vi.fn(),
  saveOvertimeDraftApi: vi.fn(),
  updateOvertimeRecord: vi.fn(),
  uploadWorkflowAttachment: vi.fn(),
}))

vi.mock('../apiClient', () => apiMocks)

describe('overtime API privacy and integrity contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits a stable idempotency key and maps the opaque public record key', async () => {
    apiMocks.createOvertimeRecord.mockResolvedValue({
      data: {
        id: 91,
        public_id: '01K123456789ABCDEFGHJKMNPQ',
        display_id: 'OT-2026-091',
        user_id: 12,
        version: 1,
      },
    })
    const { submitMyOvertimeApiFirst } = await import('../overtimeApi')

    const result = await submitMyOvertimeApiFirst('12', {
      overtimeType: 'weekday',
      claimDate: '2026-07-28',
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      reason: 'Documented after-hours handover.',
      submissionKey: 'stable-submit-key-1',
    })

    expect(apiMocks.createOvertimeRecord).toHaveBeenCalledWith(
      expect.objectContaining({ submission_key: 'stable-submit-key-1' }),
    )
    expect(result.data).toMatchObject({
      publicId: '01K123456789ABCDEFGHJKMNPQ',
      id: 'OT-2026-091',
    })
  })

  it('passes draft versions and abort signals through the API boundary', async () => {
    const controller = new AbortController()
    apiMocks.fetchOvertimeDraft.mockResolvedValue({ data: { draftVersion: 3 } })
    apiMocks.saveOvertimeDraftApi.mockResolvedValue({
      data: { reason: 'Version four', draftVersion: 4 },
    })
    apiMocks.clearOvertimeDraftApi.mockResolvedValue()
    const {
      clearMyOvertimeDraftApiFirst,
      loadMyOvertimeDraftApiFirst,
      saveMyOvertimeDraftApiFirst,
    } = await import('../overtimeApi')

    await loadMyOvertimeDraftApiFirst('12', { signal: controller.signal })
    await saveMyOvertimeDraftApiFirst('12', { reason: 'Version four' }, 3)
    await clearMyOvertimeDraftApiFirst('12', 4)

    expect(apiMocks.fetchOvertimeDraft).toHaveBeenCalledWith({ signal: controller.signal })
    expect(apiMocks.saveOvertimeDraftApi).toHaveBeenCalledWith({ reason: 'Version four' }, 3)
    expect(apiMocks.clearOvertimeDraftApi).toHaveBeenCalledWith(4)
  })

  it('loads management detail by opaque public id with request cancellation support', async () => {
    const controller = new AbortController()
    apiMocks.fetchStaffOvertimeRecordByPublicId.mockResolvedValue({
      data: {
        id: 91,
        public_id: '01K123456789ABCDEFGHJKMNPQ',
        record_key: '01K123456789ABCDEFGHJKMNPQ',
        display_id: 'OT-2026-091',
        owner_user_id: 12,
      },
    })
    const { loadStaffOvertimeRecordByPublicId } = await import('../overtimeApi')

    const result = await loadStaffOvertimeRecordByPublicId('01K123456789ABCDEFGHJKMNPQ', {
      signal: controller.signal,
    })

    expect(apiMocks.fetchStaffOvertimeRecordByPublicId).toHaveBeenCalledWith(
      '01K123456789ABCDEFGHJKMNPQ',
      { signal: controller.signal },
    )
    expect(result.data.recordKey).toBe('01K123456789ABCDEFGHJKMNPQ')
  })
})
