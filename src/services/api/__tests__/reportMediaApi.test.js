// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  buildApiUrl: (path) => `http://localhost:8000/api${path}`,
  getClientId: () => 'test-client',
  getClientMode: () => 'browser',
  getCsrfToken: () => 'csrf-token',
  refreshCsrfToken: vi.fn(async () => 'csrf-token'),
}))

import {
  classifyReportPhotoFailure,
  reportPhotoFailureMessage,
  uploadReportPhotosSequentially,
  validateReportPhotoFile,
} from '../reportMediaApi'

let activeUploads = 0
let peakUploads = 0
let failedFileNames = new Set()
let transientFailuresRemaining = new Map()
let sentUploadFields = []

class FakeXMLHttpRequest {
  constructor() {
    this.upload = {}
    this.status = 201
    this.responseText = ''
  }

  open() {}
  setRequestHeader() {}

  send(body) {
    activeUploads += 1
    peakUploads = Math.max(peakUploads, activeUploads)
    const file = body.get('file')
    sentUploadFields.push({
      batchId: body.get('batch_id'),
      uploadId: body.get('upload_id'),
      fileName: file.name,
    })
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 })
      const transientFailures = Number(transientFailuresRemaining.get(file.name) || 0)
      if (transientFailures > 0) {
        transientFailuresRemaining.set(file.name, transientFailures - 1)
        this.status = 503
        this.responseText = ''
        activeUploads -= 1
        this.onload?.()
        return
      }
      if (failedFileNames.has(file.name)) {
        this.status = 422
        this.responseText = JSON.stringify({
          code: 'image_decode_failed',
          message: `${file.name} could not be decoded.`,
        })
        activeUploads -= 1
        this.onload?.()
        return
      }
      this.responseText = JSON.stringify({
        data: {
          media_id: file.name || 'camera-photo',
          file_name: file.name || 'camera-photo.jpg',
          mime_type: 'image/jpeg',
          size_bytes: 100,
          width: 10,
          height: 10,
          url: `/report-media/${file.name || 'camera-photo'}`,
          thumbnail_url: `/report-media/${file.name || 'camera-photo'}?variant=thumbnail`,
        },
      })
      activeUploads -= 1
      this.onload?.()
    })
  }

  abort() {
    this.onabort?.()
  }
}

describe('report media API', () => {
  beforeEach(() => {
    activeUploads = 0
    peakUploads = 0
    failedFileNames = new Set()
    transientFailuresRemaining = new Map()
    sentUploadFields = []
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  })

  it('uploads files sequentially without browser image decoding', async () => {
    const originalImage = globalThis.Image
    const originalReader = globalThis.FileReader
    globalThis.Image = class {
      constructor() {
        throw new Error('Image decode must not run')
      }
    }
    globalThis.FileReader = class {
      constructor() {
        throw new Error('FileReader must not run')
      }
    }
    try {
      const photos = await uploadReportPhotosSequentially({
        files: [
          new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ],
        module: 'inspection',
        source: 'camera',
      })
      expect(photos).toHaveLength(2)
      expect(peakUploads).toBe(1)
      expect(photos[0].thumbnailUrl).toContain('variant=thumbnail')
    } finally {
      globalThis.Image = originalImage
      globalThis.FileReader = originalReader
    }
  })

  it('uploads all five selected images with stable batch and per-file identities', async () => {
    const files = Array.from(
      { length: 5 },
      (_, index) =>
        new File([`photo-${index + 1}`], `photo-${index + 1}.jpg`, {
          type: 'image/jpeg',
        }),
    )
    const uploadItems = files.map((file, index) => ({
      clientUploadId: `00000000-0000-4000-8000-00000000000${index}`,
      file,
    }))

    const photos = await uploadReportPhotosSequentially({
      files,
      module: 'inspection',
      source: 'upload',
      batchId: '10000000-0000-4000-8000-000000000000',
      uploadItems,
    })

    expect(photos).toHaveLength(5)
    expect(peakUploads).toBe(1)
    expect(sentUploadFields).toEqual(
      uploadItems.map((item, index) => ({
        batchId: '10000000-0000-4000-8000-000000000000',
        uploadId: item.clientUploadId,
        fileName: files[index].name,
      })),
    )
  })

  it('keeps successful images and reports each failed image in a mixed five-file batch', async () => {
    failedFileNames = new Set(['photo-2.jpg', 'photo-4.jpg'])
    const files = Array.from(
      { length: 5 },
      (_, index) =>
        new File([`photo-${index + 1}`], `photo-${index + 1}.jpg`, {
          type: 'image/jpeg',
        }),
    )
    const uploadItems = files.map((_, index) => ({
      clientUploadId: `20000000-0000-4000-8000-00000000000${index}`,
    }))
    const failures = []
    const states = []

    const photos = await uploadReportPhotosSequentially({
      files,
      module: 'inspection',
      source: 'upload',
      batchId: '30000000-0000-4000-8000-000000000000',
      uploadItems,
      onFailure: (failure) => failures.push(failure),
      onItemState: (state) => states.push(state),
    })

    expect(photos.map((photo) => photo.fileName)).toEqual([
      'photo-1.jpg',
      'photo-3.jpg',
      'photo-5.jpg',
    ])
    expect(failures).toHaveLength(2)
    expect(failures.map((failure) => failure.fileName)).toEqual(['photo-2.jpg', 'photo-4.jpg'])
    expect(
      states.filter((state) => state.status === 'failed').map((state) => state.clientUploadId),
    ).toEqual([uploadItems[1].clientUploadId, uploadItems[3].clientUploadId])
  })

  it('retries a transient failure with the same idempotent upload identity', async () => {
    vi.useFakeTimers()
    transientFailuresRemaining = new Map([['retry.jpg', 1]])
    try {
      const uploadPromise = uploadReportPhotosSequentially({
        files: [new File(['retry'], 'retry.jpg', { type: 'image/jpeg' })],
        module: 'inspection',
        source: 'upload',
        batchId: '40000000-0000-4000-8000-000000000000',
        uploadItems: [{ clientUploadId: '50000000-0000-4000-8000-000000000000' }],
      })

      await vi.runAllTimersAsync()
      const photos = await uploadPromise

      expect(photos).toHaveLength(1)
      expect(sentUploadFields).toHaveLength(2)
      expect(sentUploadFields.map((row) => row.uploadId)).toEqual([
        '50000000-0000-4000-8000-000000000000',
        '50000000-0000-4000-8000-000000000000',
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows extensionless and generic mobile camera metadata for server validation', () => {
    expect(
      validateReportPhotoFile(new File(['a'], '', { type: 'application/octet-stream' }), 'camera'),
    ).toBe('')
    expect(
      validateReportPhotoFile(new File(['a'], 'capture.heic', { type: 'image/heic' }), 'camera'),
    ).toBe('')
    expect(
      validateReportPhotoFile(new File(['a'], 'capture.avif', { type: 'image/avif' }), 'camera'),
    ).toBe('')
    expect(
      validateReportPhotoFile(
        { name: 'large-camera.jpg', type: 'image/jpeg', size: 24 * 1024 * 1024 },
        'camera',
      ),
    ).toBe('')
    expect(
      validateReportPhotoFile(
        { name: 'oversized-camera.jpg', type: 'image/jpeg', size: 31 * 1024 * 1024 },
        'camera',
      ),
    ).toBe('file_too_large')
  })

  it('classifies proxy and authentication failures without relying on a JSON response body', () => {
    expect(classifyReportPhotoFailure({ status: 401 })).toBe('session_expired')
    expect(classifyReportPhotoFailure({ status: 413 })).toBe('file_too_large')
    expect(classifyReportPhotoFailure({ status: 419 })).toBe('csrf_expired')
    expect(classifyReportPhotoFailure({ status: 429 })).toBe('rate_limited')
    expect(reportPhotoFailureMessage('session_expired')).toContain('session expired')
  })
})
