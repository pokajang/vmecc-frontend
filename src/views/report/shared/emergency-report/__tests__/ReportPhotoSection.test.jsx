// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportPhotoSection from '../ReportPhotoSection'
import { REPORT_MOBILE_QUERY } from '../../../hooks/useReportIsMobile'

const mediaMocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('src/services/api/reportMediaApi', () => ({
  REPORT_PHOTO_MAX_COUNT: 10,
  REPORT_PHOTO_MAX_TOTAL_BYTES: 12 * 1024 * 1024,
  deleteReportMedia: mediaMocks.remove,
  getReportPhotoBytes: (photo) => Number(photo?.sizeBytes || 0),
  reportPhotoFailureMessage: (code) => `${code}:`,
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

afterEach(() => {
  cleanup()
  delete window.matchMedia
})

beforeEach(() => {
  mediaMocks.upload.mockReset()
  mediaMocks.remove.mockReset()
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
})

describe('ReportPhotoSection', () => {
  it('supports an upload-only required-photo workflow', () => {
    render(
      <ReportPhotoSection
        moduleKey="erco"
        photos={[]}
        onChange={vi.fn()}
        allowCapture={false}
        uploadLabel="Upload photos"
        required
        error="Upload at least one incident photograph."
      />,
    )

    expect(screen.getByRole('button', { name: 'Upload photos' })).toBeTruthy()
    expect(screen.getByLabelText('Upload erco report photos')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Capture photo' })).toBeNull()
    expect(screen.queryByLabelText('Take erco report photo')).toBeNull()
    expect(screen.getByText('Upload at least 1 photo. 0 of 10 uploaded.')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain(
      'Upload at least one incident photograph.',
    )
  })

  it('opens photo removal confirmation in a drawer throughout the reporting mobile breakpoint', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query) => ({
        matches: query === REPORT_MOBILE_QUERY,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })
    render(
      <ReportPhotoSection
        moduleKey="drill"
        photos={[{ id: 'one', fileName: 'one.jpg', url: '/report-media/one' }]}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo 1' }))

    expect(document.querySelector('.mobile-bottom-drawer')).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
  })

  it('uses progressive photo descriptions on mobile', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query) => ({
        matches: query === REPORT_MOBILE_QUERY,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })
    const onChange = vi.fn()
    const photos = [
      { id: 'one', fileName: 'one.jpg', url: '/report-media/one', description: '' },
      {
        id: 'two',
        fileName: 'two.jpg',
        url: '/report-media/two',
        description: 'Existing description',
      },
    ]

    render(
      <ReportPhotoSection
        moduleKey="erco"
        photos={photos}
        onChange={onChange}
        descriptionMaxLength={2000}
      />,
    )

    expect(screen.getByText('Photo 1 of 2')).toBeTruthy()
    expect(screen.getByText('Description added')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit description for Photo 1' }))
    const description = screen.getByRole('textbox', { name: 'Description for Photo 1' })
    expect(description.getAttribute('maxlength')).toBe('2000')

    fireEvent.change(description, {
      target: { value: 'Command position\nPortrait evidence' },
    })

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'one',
        description: 'Command position\nPortrait evidence',
      }),
      expect.objectContaining({ id: 'two', description: 'Existing description' }),
    ])
  })

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
      'invalid_file:',
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

  it('does not cancel an active upload when the processing callback identity changes', async () => {
    let capturedSignal = null
    let resolveUpload
    mediaMocks.upload.mockImplementation(
      ({ signal }) =>
        new Promise((resolve) => {
          capturedSignal = signal
          resolveUpload = resolve
        }),
    )
    const onChange = vi.fn()
    const { rerender } = render(
      <ReportPhotoSection
        moduleKey="drill"
        photos={[]}
        onChange={onChange}
        onProcessingChange={vi.fn()}
      />,
    )
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Upload drill report photos'), {
      target: { files: [file] },
    })
    await waitFor(() => expect(capturedSignal).toBeTruthy())

    rerender(
      <ReportPhotoSection
        moduleKey="drill"
        photos={[]}
        onChange={onChange}
        onProcessingChange={vi.fn()}
      />,
    )

    expect(capturedSignal.aborted).toBe(false)
    resolveUpload([
      {
        mediaId: 'media-1',
        fileName: 'photo.jpg',
        url: '/report-media/media-1',
        sizeBytes: 1200,
      },
    ])
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
  })

  it('preserves multiline photo descriptions without mutating sibling photos', () => {
    const onChange = vi.fn()
    render(
      <ReportPhotoSection
        moduleKey="erco"
        photos={[
          { id: 'one', fileName: 'one.jpg', url: '/report-media/one', description: '' },
          { id: 'two', fileName: 'two.jpg', url: '/report-media/two', description: '' },
        ]}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Description for photo 1' }), {
      target: { value: 'Command position\nPortrait evidence' },
    })

    expect(screen.queryByText('one.jpg')).toBeNull()
    expect(screen.queryByRole('img', { name: 'one.jpg' })).toBeNull()

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'one', description: 'Command position\nPortrait evidence' }),
      expect.objectContaining({ id: 'two', description: '' }),
    ])
  })
})
