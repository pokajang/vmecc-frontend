import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadInspectionDraft,
  resolveInspectionDraftConflict,
  saveInspectionDraft,
} from '../domain/storage/inspectionStorage'

const harness = vi.hoisted(() => ({ apiRequest: vi.fn(), localDraft: null }))
vi.mock('src/services/apiClient', () => ({ apiRequest: harness.apiRequest }))
vi.mock('../domain/offline/inspectionOfflineStore', () => ({
  loadOfflineDraftSync: vi.fn(() => harness.localDraft),
  saveOfflineDraft: vi.fn(async (_userId, draft) => {
    harness.localDraft = draft
    return draft
  }),
  clearOfflineDraft: vi.fn(async () => {
    harness.localDraft = null
  }),
}))

describe('inspection draft concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    harness.localDraft = null
  })

  it('creates a distinct draft then updates that exact draft with its base version', async () => {
    harness.apiRequest
      .mockResolvedValueOnce({
        data: {
          draft_id: 'draft-1',
          version: 1,
          saved_at: '2026-07-11T12:00:00Z',
          payload: { incidentType: 'General Inspection', description: 'First' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          draft_id: 'draft-1',
          version: 2,
          saved_at: '2026-07-11T12:01:00Z',
          payload: { incidentType: 'General Inspection', description: 'Second' },
        },
      })

    await saveInspectionDraft('user-1', {
      incidentType: 'General Inspection',
      description: 'First',
    })
    await saveInspectionDraft('user-1', {
      incidentType: 'General Inspection',
      description: 'Second',
    })

    expect(harness.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/reports/drafts',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"create_new":true'),
      }),
    )
    expect(harness.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/reports/drafts/draft-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"base_version":1'),
      }),
    )
    expect(harness.localDraft).toMatchObject({
      description: 'Second',
      __serverDraftId: 'draft-1',
      __serverDraftVersion: 2,
      __offlineSyncStatus: 'synced',
    })
  })

  it('preserves both local and server snapshots on a version conflict', async () => {
    harness.localDraft = {
      incidentType: 'General Inspection',
      description: 'Local edit',
      __serverDraftId: 'draft-1',
      __serverDraftVersion: 1,
      __offlineSyncStatus: 'synced',
    }
    const error = new Error('This draft changed since it was loaded.')
    error.status = 409
    error.payload = {
      code: 'report_draft_version_conflict',
      currentDraft: {
        draft_id: 'draft-1',
        version: 2,
        payload: { incidentType: 'General Inspection', description: 'Server edit' },
      },
    }
    harness.apiRequest.mockRejectedValue(error)

    const result = await saveInspectionDraft('user-1', {
      incidentType: 'General Inspection',
      description: 'Local edit after conflict',
    })

    expect(result).toMatchObject({ saved: true, synced: false, conflict: true })
    expect(harness.localDraft).toMatchObject({
      description: 'Local edit after conflict',
      __offlineSyncStatus: 'conflict',
      __offlineDraftConflict: {
        serverDraft: expect.objectContaining({ version: 2 }),
      },
    })
    await expect(loadInspectionDraft('user-1')).resolves.toMatchObject({
      description: 'Local edit after conflict',
      __offlineSyncStatus: 'conflict',
    })
  })

  it('can keep the server copy or save the local copy as a new independent draft', async () => {
    harness.localDraft = {
      description: 'Local edit',
      __serverDraftId: 'draft-1',
      __serverDraftVersion: 1,
      __offlineSyncStatus: 'conflict',
      __offlineDraftConflict: {
        serverDraft: {
          draft_id: 'draft-1',
          version: 2,
          payload: { description: 'Server edit' },
        },
      },
    }
    await expect(resolveInspectionDraftConflict('user-1', 'keep-server')).resolves.toMatchObject({
      resolved: true,
      strategy: 'keep-server',
    })
    expect(harness.localDraft).toMatchObject({
      description: 'Server edit',
      __serverDraftVersion: 2,
    })

    harness.localDraft = {
      description: 'Local edit',
      __serverDraftId: 'draft-1',
      __serverDraftVersion: 1,
      __offlineSyncStatus: 'conflict',
      __offlineDraftConflict: { serverDraft: { draft_id: 'draft-1', version: 2, payload: {} } },
    }
    harness.apiRequest.mockResolvedValue({
      data: { draft_id: 'draft-2', version: 1, payload: { description: 'Local edit' } },
    })
    await resolveInspectionDraftConflict('user-1', 'keep-local-as-new')
    expect(harness.apiRequest).toHaveBeenLastCalledWith(
      '/reports/drafts',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(harness.localDraft.__serverDraftId).toBe('draft-2')
  })
})
