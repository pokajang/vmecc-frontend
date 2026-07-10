// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  buildApiUrl: (path) => `http://localhost:8000/api${path}`,
  getClientId: () => 'test-client',
  getClientMode: () => 'browser',
  getCsrfToken: () => 'csrf-token',
  refreshCsrfToken: vi.fn(async () => 'csrf-token'),
}))

import { uploadReportPhotosSequentially, validateReportPhotoFile } from '../reportMediaApi'

let activeUploads = 0
let peakUploads = 0

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
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 })
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

  it('allows extensionless and generic mobile camera metadata for server validation', () => {
    expect(
      validateReportPhotoFile(new File(['a'], '', { type: 'application/octet-stream' }), 'camera'),
    ).toBe('')
    expect(
      validateReportPhotoFile(new File(['a'], 'capture.heic', { type: 'image/heic' }), 'camera'),
    ).toBe('')
  })
})
