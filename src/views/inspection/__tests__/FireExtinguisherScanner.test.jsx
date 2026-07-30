// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import FireExtinguisherScanner from '../types/fire-extinguisher/FireExtinguisherScanner'
import * as scannerSupport from '../types/fire-extinguisher/scannerSupport'
import * as inspectionFireExtinguisherApi from '../domain/api/inspectionFireExtinguisherApi'

const decodeFromStream = vi.fn()
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
  BarcodeFormat: {
    QR_CODE: 11,
    CODE_39: 2,
    CODE_128: 4,
    11: 'QR_CODE',
    2: 'CODE_39',
    4: 'CODE_128',
  },
  BrowserMultiFormatReader: function BrowserMultiFormatReader() {
    this.decodeFromStream = decodeFromStream
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

vi.mock('../domain/api/inspectionFireExtinguisherApi', async () => {
  const actual = await vi.importActual('../domain/api/inspectionFireExtinguisherApi')
  return {
    ...actual,
    fetchFireExtinguisherOptions: vi.fn(),
  }
})

describe('FireExtinguisherScanner', () => {
  beforeEach(() => {
    decodeFromStream.mockReset()
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
    getUserMedia.mockResolvedValue(mediaStream)
    enumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'front-1', label: 'Front Camera' },
      { kind: 'videoinput', deviceId: 'rear-1', label: 'Back Camera' },
    ])
    vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions)
      .mockReset()
      .mockResolvedValue({
        data: [],
        meta: {},
      })
    decodeFromStream.mockResolvedValue({ stop: vi.fn() })
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
    vi.restoreAllMocks()
  })

  it('starts camera only after Start camera is clicked', async () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Start camera' })).toBeTruthy()
    expect(screen.getByLabelText('Enter fire extinguisher code manually')).toBeTruthy()
    expect(getUserMedia).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    expect(decodeFromStream).toHaveBeenCalledWith(
      mediaStream,
      expect.any(HTMLVideoElement),
      expect.any(Function),
    )
  })

  it('uses the mobile bottom drawer on compact mobile viewports', () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })

    try {
      const { container } = render(
        <FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />,
      )

      expect(screen.getByText('Search FE by Serial Number')).toBeTruthy()
      expect(container.querySelector('.mobile-bottom-drawer')).toBeTruthy()
    } finally {
      if (originalMatchMedia) {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: originalMatchMedia,
        })
      } else {
        delete window.matchMedia
      }
    }
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

  it('does not call onScan after only one valid camera decode', async () => {
    const onScan = vi.fn()
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => 'EE072021Z047268' })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await screen.findByText('FE code detected. Hold steady to confirm scan.')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('calls onScan when ZXing returns the same FE serial twice', async () => {
    const onScan = vi.fn()
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => 'EE072021Z047268' })
      callback({ getText: () => 'EE072021Z047268' })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('EE072021Z047268'))
  })

  it('extracts only the FE serial from a full QR payload after matching decodes', async () => {
    const onScan = vi.fn()
    const payload =
      'FF112021Y901894;2027-01-30 09:42:32;COMMON AREA (4)-NO.5-2 JLN SERI PUTRA 1/5, BDR SERI PUTRA, 43000 KAJANG, SELANGOR'
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => payload, getBarcodeFormat: () => 11 })
      callback({ getText: () => payload, getBarcodeFormat: () => 11 })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('FF112021Y901894'))
    expect(onScan).not.toHaveBeenCalledWith(payload)
  })

  it('rejects numeric false-positive camera decodes', async () => {
    const onScan = vi.fn()
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => '1234567890', getBarcodeFormat: () => 7 })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(
      await screen.findByText('Detected a code, but it is not a valid FE serial.'),
    ).toBeTruthy()
    expect(onScan).not.toHaveBeenCalled()
    expect(screen.getByText('Scanner diagnostics')).toBeTruthy()
  })

  it('prompts manual entry after repeated unreadable camera scans', async () => {
    const onScan = vi.fn()
    decodeFromStream.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => '1234567890', getBarcodeFormat: () => 7 })
      callback({ getText: () => '0987654321', getBarcodeFormat: () => 7 })
      callback({ getText: () => '1234509876', getBarcodeFormat: () => 7 })
      return { stop: vi.fn() }
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    expect(await screen.findByText('QR code unsuccessful. Enter the code below.')).toBeTruthy()
    expect(onScan).not.toHaveBeenCalled()
  })

  it('keeps the manual lookup clean until the user types, then shows matching suggestions', async () => {
    const options = [
      { serial: 'EE072021Z047268', label: 'EE072021Z047268' },
      { serial: 'SR112021Z901894', label: 'SR112021Z901894' },
    ]
    const onScan = vi.fn()
    render(
      <FireExtinguisherScanner
        visible
        onClose={vi.fn()}
        onScan={onScan}
        fireExtinguisherSerialOptions={options}
      />,
    )
    const input = screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits')
    fireEvent.focus(input)

    expect(screen.queryByText(/stored S\/N values/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'EE072021Z047268' })).toBeNull()

    fireEvent.change(input, { target: { value: 'EE' } })
    expect(screen.getByRole('button', { name: 'EE072021Z047268' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'SR112021Z901894' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'EE072021Z047268' }))
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('EE072021Z047268'))
  })

  it('loads stored FE IDs from API as user types and uses the returned matches', async () => {
    vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions).mockResolvedValue({
      data: [
        {
          barcodeNo: 'SR100021Z000001',
          feType: 'CO2 5KG',
          idLocNo: 'ADO-003',
          zone: '1',
          mainLocation: 'Main',
          subLocation: 'A',
        },
        {
          barcodeNo: 'SR100021Z000002',
          feType: 'DCP 9KG',
          idLocNo: 'ADO-005',
          zone: '1',
          mainLocation: 'Main',
          subLocation: 'B',
        },
        { barcodeNo: 'EE900021Z000003', zone: '1', mainLocation: 'Main', subLocation: 'A' },
      ],
      meta: {},
    })

    const onScan = vi.fn()
    render(
      <FireExtinguisherScanner
        visible
        onClose={vi.fn()}
        onScan={onScan}
        fireExtinguisherSerialSearchScope={{
          zone: '1',
          mainLocation: 'Main Hub',
          subLocation: 'Area 5',
        }}
      />,
    )
    const input = screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits')

    fireEvent.change(input, { target: { value: 'S' } })
    await waitFor(() =>
      expect(
        vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
      ).not.toHaveBeenCalled(),
    )

    fireEvent.change(input, { target: { value: 'SR' } })
    await waitFor(() =>
      expect(
        vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
      ).toHaveBeenCalledTimes(1),
    )

    expect(
      vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
    ).toHaveBeenCalledWith({
      zone: '1',
      mainLocation: 'Main Hub',
      subLocation: 'Area 5',
      search: 'SR',
    })

    expect(screen.getByRole('button', { name: 'SR100021Z000001 - CO2 5KG - ADO-003' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SR100021Z000002 - DCP 9KG - ADO-005' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'SR100021Z000001 - CO2 5KG - ADO-003' }))
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('SR100021Z000001'))
    expect(screen.queryByText('No matching stored S/N values found.')).toBeNull()
  })

  it('falls back to global FE search when the current location has no serial matches', async () => {
    vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions)
      .mockResolvedValueOnce({
        data: [],
        meta: {},
      })
      .mockResolvedValueOnce({
        data: [
          {
            barcodeNo: 'SR032015Z133570',
            feType: 'DP 9KG',
            idLocNo: 'ER04-007',
            zone: '3',
            mainLocation: 'ER-04',
            subLocation: 'Level 4',
          },
        ],
        meta: {},
      })

    render(
      <FireExtinguisherScanner
        visible
        onClose={vi.fn()}
        onScan={vi.fn()}
        fireExtinguisherSerialSearchScope={{
          zone: '3',
          mainLocation: 'ER-04',
          subLocation: 'Level 2',
        }}
      />,
    )

    const input = screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits')
    fireEvent.change(input, { target: { value: '33570' } })

    await waitFor(() =>
      expect(
        vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
      ).toHaveBeenCalledTimes(2),
    )

    expect(
      vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
    ).toHaveBeenNthCalledWith(1, {
      zone: '3',
      mainLocation: 'ER-04',
      subLocation: 'Level 2',
      search: '33570',
    })
    expect(
      vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
    ).toHaveBeenNthCalledWith(2, {
      zone: '',
      mainLocation: '',
      subLocation: '',
      search: '33570',
    })

    expect(screen.getByRole('button', { name: 'SR032015Z133570 - DP 9KG - ER04-007' })).toBeTruthy()
    expect(screen.queryByText('No matching stored S/N values found.')).toBeNull()
  })

  it('prioritizes FE serial suffix matches for short numeric search queries', async () => {
    vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions).mockResolvedValue({
      data: [
        { barcodeNo: 'SR032015Z112794', feType: 'CO2 5KG', idLocNo: 'SS2-001' },
        { barcodeNo: 'SR032015Z102652', feType: 'DCP 9KG', idLocNo: 'DP 4KG' },
        { barcodeNo: 'SR032015Z102794', feType: 'CO2 5KG', idLocNo: 'ADO-003' },
      ],
      meta: {},
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)
    const input = screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits')

    fireEvent.change(input, { target: { value: '2794' } })

    await waitFor(() =>
      expect(
        vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions),
      ).toHaveBeenCalledWith({
        zone: '',
        mainLocation: '',
        subLocation: '',
        search: '2794',
      }),
    )

    const suffixMatches = screen
      .getAllByRole('button')
      .map((element) => element.textContent)
      .filter((label) => String(label || '').includes('2794'))

    expect(suffixMatches).toEqual([
      'SR032015Z112794 - CO2 5KG - SS2-001',
      'SR032015Z102794 - CO2 5KG - ADO-003',
    ])
  })

  it('auto-selects the only visible stored FE match when checking a partial query', async () => {
    const onScan = vi.fn()
    render(
      <FireExtinguisherScanner
        visible
        onClose={vi.fn()}
        onScan={onScan}
        fireExtinguisherSerialOptions={[
          {
            serial: 'EE072021Z047268',
            feType: 'CO2 5KG',
            idLocNo: 'ADO-003',
          },
        ]}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits'), {
      target: { value: '7268' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('EE072021Z047268'))
  })

  it('blocks ambiguous manual FE submissions until the user chooses a stored match', async () => {
    const onScan = vi.fn()
    vi.mocked(inspectionFireExtinguisherApi.fetchFireExtinguisherOptions).mockResolvedValue({
      data: [
        { barcodeNo: 'SR032015Z112794', feType: 'CO2 5KG', idLocNo: 'SS2-001' },
        { barcodeNo: 'SR032015Z102794', feType: 'CO2 5KG', idLocNo: 'ADO-003' },
      ],
      meta: {},
    })

    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)

    fireEvent.change(screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits'), {
      target: { value: '2794' },
    })

    await screen.findByRole('button', { name: 'SR032015Z112794 - CO2 5KG - SS2-001' })
    await screen.findByRole('button', { name: 'SR032015Z102794 - CO2 5KG - ADO-003' })

    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(onScan).not.toHaveBeenCalled()
    expect(screen.getByText('Select a stored FE from the list.')).toBeTruthy()
  })

  it('does not submit a manual FE serial that is not loaded from stored options', async () => {
    const onScan = vi.fn()
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)

    fireEvent.change(screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits'), {
      target: { value: 'EE072021Z047268' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(onScan).not.toHaveBeenCalled()
    expect(screen.getByText('No matching stored S/N values found.')).toBeTruthy()
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

  it('hides the camera preview after scan timeout and shows manual fallback hint', async () => {
    decodeFromStream.mockImplementation(async (_stream, _video, _callback) => {
      return { stop: vi.fn() }
    })

    const onScan = vi.fn()
    const { container } = render(
      <FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await new Promise((resolve) => {
      window.setTimeout(resolve, 4100)
    })

    expect(
      screen.getAllByText('QR code unsuccessful. Enter the code below.').length,
    ).toBeGreaterThan(0)
    expect(container.querySelector('video')).toBeNull()
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
    render(
      <FireExtinguisherScanner
        visible
        onClose={vi.fn()}
        onScan={onScan}
        fireExtinguisherSerialOptions={[{ serial: 'EE072021Z047268' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    expect(await screen.findByText('Open in a supported browser')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits'), {
      target: { value: 'EE072021Z047268' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(onScan).toHaveBeenCalledWith('EE072021Z047268')
  })

  it('keeps manual FE submission disabled until input has a value', () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Type FE serial, unit no, or last 4-6 digits'), {
      target: { value: '   ' },
    })

    expect(screen.getByRole('button', { name: 'Check FE' }).hasAttribute('disabled')).toBe(true)
  })
})
