// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportPhotoSection from '../ReportPhotoSection'

const mediaMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('src/services/api/reportMediaApi', () => ({
  REPORT_PHOTO_MAX_COUNT: 10,
  REPORT_PHOTO_MAX_TOTAL_BYTES: 12 * 1024 * 1024,
  deleteReportMedia: mediaMocks.remove,
  getReportPhotoBytes: (photo) => Number(photo?.sizeBytes || 0),
  reportPhotoFailureMessage: (code, fileName = '') => `${code}:${fileName}`,
  uploadReportPhotosSequentially: mediaMocks.upload,
}))

vi.mock('src/utils/cameraRecovery', () => ({
  clearPendingCameraOperation: vi.fn(),
  getInterruptedCameraFallback: vi.fn(() => null),
  isLikelyEmbeddedBrowser: vi.fn(() => false),
  markPendingCameraOperation: vi.fn(),
  markPendingCameraUploadStarted: vi.fn(),
  subscribeToCameraReturn: vi.fn(() => () => {}),
}))

afterEach(cleanup)

beforeEach(() => {
  mediaMocks.upload.mockReset()
  mediaMocks.remove.mockReset()
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
})

describe('ReportPhotoSection', () => {
  it('opens the camera input synchronously without awaiting draft persistence', () => {
    const beforeCamera = vi.fn(() => new Promise(() => {}))
    render(
      <ReportPhotoSection
        moduleKey="drill"
        photos={[]}
        onChange={vi.fn()}
        onBeforeCameraOpen={beforeCamera}
      />,
    )
    const cameraInput = screen.getByLabelText('Take drill report photo')
    const inputClick = vi.spyOn(cameraInput, 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Capture photo' }))

    expect(beforeCamera).toHaveBeenCalledTimes(1)
    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('keeps successful uploads when another selected file fails', async () => {
    const onChange = vi.fn()
    const pushToast = vi.fn()
    mediaMocks.upload.mockImplementation(async ({ onFailure, onProgress }) => {
      onProgress({ index: 0, count: 2, percent: 100 })
      onFailure({ code: 'invalid_file', fileName: 'bad.jpg' })
      return [
        {
          mediaId: 'media-1',
          fileName: 'good.jpg',
          url: '/report-media/media-1',
          sizeBytes: 1200,
          leaseId: 'lease-1',
        },
      ]
    })
    render(
      <ReportPhotoSection
        moduleKey="drill"
        photos={[]}
        onChange={onChange}
        pushToast={pushToast}
      />,
    )

    const uploadInput = screen.getByLabelText('Upload drill report photos')
    const good = new File(['good'], 'good.jpg', { type: 'image/jpeg' })
    const bad = new File(['bad'], 'bad.jpg', { type: 'image/jpeg' })
    fireEvent.change(uploadInput, { target: { files: [good, bad] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange.mock.calls[0][0][0]).toMatchObject({
      mediaId: 'media-1',
      leaseId: 'lease-1',
    })
    expect(pushToast).toHaveBeenCalledWith(
      'invalid_file:bad.jpg',
      expect.objectContaining({ title: 'Upload warning' }),
    )
    expect(uploadInput.value).toBe('')
  })

  it('allows an active upload to be cancelled', async () => {
    let capturedSignal = null
    mediaMocks.upload.mockImplementation(
      ({ signal, onProgress }) =>
        new Promise((resolve, reject) => {
          capturedSignal = signal
          onProgress({ index: 0, count: 1, percent: 25 })
          signal.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError')),
          )
        }),
    )
    render(<ReportPhotoSection moduleKey="drill" photos={[]} onChange={vi.fn()} />)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Upload drill report photos'), {
      target: { files: [file] },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload' }))

    expect(capturedSignal.aborted).toBe(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel upload' })).toBeNull())
  })
})
