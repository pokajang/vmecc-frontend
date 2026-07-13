import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from 'src/services/apiClient'
import { getReportDraftApi, saveReportDraftApi, updateReportDraftApi } from '../reportDraftApi'

vi.mock('src/services/apiClient', () => ({ apiRequest: vi.fn() }))

describe('reportDraftApi concurrency', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retains the server draft version and sends it on an exact update', async () => {
    apiRequest
      .mockResolvedValueOnce({
        data: {
          id: 1,
          draft_id: 'drf_erco_1',
          report_type: 'erco',
          version: 3,
          payload: { incidentType: 'Fire' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 1,
          draft_id: 'drf_erco_1',
          report_type: 'erco',
          version: 4,
          payload: { incidentType: 'Fire' },
        },
      })

    const loaded = await getReportDraftApi({ draftId: 'drf_erco_1' })
    expect(loaded.version).toBe(3)

    const updated = await updateReportDraftApi({
      draftId: loaded.draftId,
      payload: loaded.payload,
      baseVersion: loaded.version,
    })

    expect(updated.version).toBe(4)
    expect(JSON.parse(apiRequest.mock.calls[1][1].body).base_version).toBe(3)
  })

  it('sends singleton Drill draft identity and version through the save endpoint', async () => {
    apiRequest.mockResolvedValue({
      data: {
        id: 2,
        draft_id: 'drf_drill_1',
        report_type: 'drill',
        version: 6,
        payload: { schemaVersion: 2 },
      },
    })

    const saved = await saveReportDraftApi({
      reportTypeSlug: 'drill',
      payload: { schemaVersion: 2 },
      draftId: 'drf_drill_1',
      baseVersion: 5,
    })

    expect(saved).toEqual(expect.objectContaining({ draftId: 'drf_drill_1', version: 6 }))
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ draft_id: 'drf_drill_1', base_version: 5 }),
    )
  })
})
