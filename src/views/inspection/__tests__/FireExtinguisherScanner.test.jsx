// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import FireExtinguisherScanner from '../types/fire-extinguisher/FireExtinguisherScanner'
import * as scannerSupport from '../types/fire-extinguisher/scannerSupport'

const decodeFromStream = vi.fn()
const decodeFromImageUrl = vi.fn()
const getUserMedia = vi.fn()
const enumerateDevices = vi.fn()
const logError = vi.fn()
const stopTrack = vi.fn()

const mediaStream = {
  getTracks: () => [{ stop: stopTrack }],
  getVideoTracks: () => [
    {
      label: 'Back Camera',
      getSettings: () => ({ deviceId: 'rear-1' }),
    },
  ],
}

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: function BrowserMultiFormatReader() {
    this.decodeFromStream = decodeFromStream
    this.decodeFromImageUrl = decodeFromImageUrl
  },
}))

vi.mock('src/services/logger', () => ({
  logError: (...args) => logError(...args),
}))

vi.mock('../types/fire-extinguisher/scannerSupport', async () => {
  const actual = await vi.importActual('../types/fire-extinguisher/scannerSupport')
  return {
    ...actual,
    inspectScannerEnvironment: vi.fn(),
  }
})

describe('FireExtinguisherScanner', () => {
  beforeEach(() => {
    decodeFromStream.mockReset()
    decodeFromImageUrl.mockReset()
    getUserMedia.mockReset()
    enumerateDevices.mockReset()
    logError.mockReset()
    stopTrack.mockReset()

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices,
      },
    })
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:scanner-image'),
    })
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })

    getUserMedia.mockResolvedValue(mediaStream)
    enumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'front-1', label: 'Front Camera' },
      { kind: 'videoinput', deviceId: 'rear-1', label: 'Back Camera' },
    ])
    decodeFromStream.mockResolvedValue({ stop: vi.fn() })
    decodeFromImageUrl.mockResolvedValue({ getText: () => 'SR102014Z060198' })
    vi.mocked(scannerSupport.inspectScannerEnvironment).mockResolvedValue({
      isSecureContext: true,
      isTopLevelContext: true,
      displayMode: 'browser',
      supportsMediaDevices: true,
      permissionState: 'prompt',
      policyAllowsCamera: true,
      policySupported: true,
      online: true,
      userAgent: 'Vitest Browser',
      serviceWorkerSupported: false,
      serviceWorkerControlled: false,
      serviceWorkerCacheVersion: '',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('starts camera only after Start camera is clicked', async () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

    expect(
      screen.getByText(
        'Tap Start camera to request camera access, or scan from an uploaded image.',
      ),
    ).toBeTruthy()
    expect(getUserMedia).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    expect(decodeFromStream).toHaveBeenCalledWith(
      mediaStream,
      expect.any(HTMLVideoElement),
      expect.any(Function),
    )
  })

  it('tries fallback constraints when rear-camera size constraints fail', async () => {
    getUserMedia
      .mockRejectedValueOnce(
        Object.assign(new Error('Cannot satisfy requested size.'), {
          name: 'OverconstrainedError',
        }),
      )
      .mockResolvedValueOnce(mediaStream)

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
    expect(getUserMedia.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        video: expect.objectContaining({
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }),
      }),
    )
    expect(getUserMedia.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        video: expect.objectContaining({
          facingMode: { ideal: 'environment' },
        }),
      }),
    )
  })

  it('calls onScan when ZXing returns a QR or barcode result', async () => {
    const onScan = vi.fn()
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => 'EE072021Z047268' })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('EE072021Z047268'))
  })

  it('shows accurate diagnostics for missing media devices', async () => {
    vi.mocked(scannerSupport.inspectScannerEnvironment).mockResolvedValue({
      isSecureContext: true,
      isTopLevelContext: true,
      displayMode: 'browser',
      supportsMediaDevices: false,
      permissionState: 'prompt',
      policyAllowsCamera: true,
      policySupported: true,
      online: true,
      userAgent: 'Vitest Browser',
      serviceWorkerSupported: false,
      serviceWorkerControlled: false,
      serviceWorkerCacheVersion: '',
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('Open in a supported browser')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry camera' })).toBeTruthy()
    expect(screen.getByText('Scanner diagnostics')).toBeTruthy()
    expect(logError).toHaveBeenCalledWith(
      '[FireExtinguisherScanner] camera access failed',
      expect.any(Error),
      expect.objectContaining({
        failureType: 'unsupported_browser',
      }),
    )
  })

  it('shows accurate diagnostics for permission denied', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }),
    )

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('Camera access was denied')).toBeTruthy()
    expect(logError).toHaveBeenCalledWith(
      '[FireExtinguisherScanner] camera access failed',
      expect.any(Error),
      expect.objectContaining({
        failureType: 'permission_denied_session',
      }),
    )
  })

  it('shows accurate diagnostics for camera busy errors', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('Could not start video source'), { name: 'NotReadableError' }),
    )

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('Camera unavailable')).toBeTruthy()
    expect(logError).toHaveBeenCalledWith(
      '[FireExtinguisherScanner] camera access failed',
      expect.any(Error),
      expect.objectContaining({
        failureType: 'camera_busy_or_unreadable',
      }),
    )
  })

  it('shows accurate diagnostics for generic startup errors', async () => {
    getUserMedia.mockRejectedValue(new TypeError('Browser startup failed'))

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('Camera could not start')).toBeTruthy()
    expect(logError).toHaveBeenCalledWith(
      '[FireExtinguisherScanner] camera access failed',
      expect.any(TypeError),
      expect.objectContaining({
        failureType: 'startup_failed',
      }),
    )
  })

  it('decodes from uploaded image fallback', async () => {
    const onScan = vi.fn()
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)

    fireEvent.change(screen.getByLabelText('Scan FE code from image'), {
      target: {
        files: [new File(['image'], 'fe-code.jpg', { type: 'image/jpeg' })],
      },
    })

    await waitFor(() => expect(decodeFromImageUrl).toHaveBeenCalledWith('blob:scanner-image'))
    expect(onScan).toHaveBeenCalledWith('SR102014Z060198')
  })

  it('keeps manual FE code entry available when camera scanning is blocked', async () => {
    vi.mocked(scannerSupport.inspectScannerEnvironment).mockResolvedValue({
      isSecureContext: true,
      isTopLevelContext: true,
      displayMode: 'browser',
      supportsMediaDevices: false,
      permissionState: 'prompt',
      policyAllowsCamera: true,
      policySupported: true,
      online: true,
      userAgent: 'Vitest Browser',
      serviceWorkerSupported: false,
      serviceWorkerControlled: false,
      serviceWorkerCacheVersion: '',
    })
    const onScan = vi.fn()
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    expect(await screen.findByText('Open in a supported browser')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Example: SR102014Z060198'), {
      target: { value: 'EE072021Z047268' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(onScan).toHaveBeenCalledWith('EE072021Z047268')
  })

  it('validates manual FE code input before submission', () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Example: SR102014Z060198'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(screen.getByText('Enter a valid S/N, QR, or barcode value.')).toBeTruthy()
  })
})
