// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const offlineStoreMock = vi.hoisted(() => {
  let record = null
  return {
    loadOfflineValue: vi.fn(async () => record),
    offlineStoreKeys: {
      photoUploads: (userId, scopeKey) => `photo-uploads:${userId}:${scopeKey}`,
    },
    removeOfflineValue: vi.fn(async () => {
      record = null
      return true
    }),
    saveOfflineValue: vi.fn(async (key, value) => {
      record = { key, value }
      return { persisted: true }
    }),
    reset: () => {
      record = null
    },
  }
})

vi.mock('../domain/offline/inspectionOfflineStore', () => offlineStoreMock)

import {
  loadInspectionPhotoUploadQueue,
  saveInspectionPhotoUploadQueue,
} from '../form/inspectionPhotoUploadStore'

describe('inspection photo upload store', () => {
  beforeEach(() => {
    offlineStoreMock.reset()
    vi.clearAllMocks()
  })

  it('retains selected file data and restores interrupted entries as retryable failures', async () => {
    const file = new File(['photo bytes'], 'mobile-photo.jpg', {
      type: 'image/jpeg',
      lastModified: 1234,
    })

    await expect(
      saveInspectionPhotoUploadQueue({
        userId: 'user-1',
        scopeKey: 'draft-1',
        items: [
          {
            batchId: 'batch-1',
            clientUploadId: 'upload-1',
            index: 0,
            count: 1,
            file,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            source: 'upload',
            status: 'uploading',
            uploadTarget: { kind: 'root' },
          },
        ],
      }),
    ).resolves.toEqual({ persisted: true, count: 1 })

    const [recovered] = await loadInspectionPhotoUploadQueue({
      userId: 'user-1',
      scopeKey: 'draft-1',
    })

    expect(recovered).toMatchObject({
      batchId: 'batch-1',
      clientUploadId: 'upload-1',
      fileName: 'mobile-photo.jpg',
      status: 'failed',
      failure: {
        code: 'interrupted_upload',
      },
    })
    expect(recovered.file).toBe(file)
  })

  it('removes persisted queue data once every item is terminal', async () => {
    const file = new File(['photo bytes'], 'done.jpg', { type: 'image/jpeg' })

    await saveInspectionPhotoUploadQueue({
      userId: 'user-1',
      scopeKey: 'draft-1',
      items: [{ file, status: 'uploaded' }],
    })

    expect(offlineStoreMock.removeOfflineValue).toHaveBeenCalledWith('photo-uploads:user-1:draft-1')
  })
})
