// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InspectionCameraCapture from '../form/components/InspectionCameraCapture'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('InspectionCameraCapture', () => {
  it('captures from the in-app stream and stops the camera', async () => {
    const track = { stop: vi.fn() }
    const stream = { getTracks: () => [track] }
    const startCameraStream = vi.fn().mockResolvedValue(stream)
    const file = new File(['photo'], 'capture.jpg', { type: 'image/jpeg' })
    const captureFrame = vi.fn().mockResolvedValue(file)
    const onCapture = vi.fn().mockResolvedValue(undefined)

    render(
      <InspectionCameraCapture
        visible
        startCameraStream={startCameraStream}
        captureFrame={captureFrame}
        onCapture={onCapture}
      />,
    )

    const video = await screen.findByLabelText('Inspection camera preview')
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1280 },
      videoHeight: { configurable: true, value: 720 },
    })
    fireEvent.canPlay(video)

    const captureButton = await screen.findByRole('button', { name: 'Capture photo' })
    await waitFor(() => expect(captureButton.disabled).toBe(false))
    fireEvent.click(captureButton)

    await waitFor(() => expect(onCapture).toHaveBeenCalledWith(file))
    expect(captureFrame).toHaveBeenCalledWith({ video })
    expect(track.stop).toHaveBeenCalled()
  })

  it('offers a fallback upload button when in-app streaming is denied', async () => {
    const onUploadPhoto = vi.fn()
    render(
      <InspectionCameraCapture
        visible
        startCameraStream={vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))}
        onUploadPhoto={onUploadPhoto}
      />,
    )

    const uploadButton = await screen.findByRole('button', { name: 'Upload photo' })
    fireEvent.click(uploadButton)
    expect(onUploadPhoto).toHaveBeenCalledTimes(1)
  })
})
