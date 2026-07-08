// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import FireExtinguisherScanner from '../types/fire-extinguisher/FireExtinguisherScanner'
import * as scannerSupport from '../types/fire-extinguisher/scannerSupport'

const decodeFromVideoDevice = vi.fn()
const logError = vi.fn()

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: function BrowserMultiFormatReader() {
    this.decodeFromVideoDevice = decodeFromVideoDevice
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
    decodeFromVideoDevice.mockReset()
    logError.mockReset()
    vi.mocked(scannerSupport.inspectScannerEnvironment).mockResolvedValue({
      isSecureContext: true,
      isTopLevelContext: true,
      supportsMediaDevices: false,
      permissionState: 'prompt',
      policyAllowsCamera: true,
      policySupported: true,
      online: true,
      userAgent: 'Vitest Browser',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the classified unsupported-browser alert and diagnostics', async () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

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

  it('keeps manual FE code entry available when camera scanning is blocked', async () => {
    const onScan = vi.fn()
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={onScan} />)

    expect(await screen.findByText('Open in a supported browser')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Example: SR102014Z060198'), {
      target: { value: 'EE072021Z047268' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(onScan).toHaveBeenCalledWith('EE072021Z047268')
  })

  it('validates manual FE code input before submission', async () => {
    render(<FireExtinguisherScanner visible onClose={vi.fn()} onScan={vi.fn()} />)

    expect(await screen.findByText('Open in a supported browser')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Example: SR102014Z060198'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check FE' }))

    expect(screen.getByText('Enter a valid S/N, QR, or barcode value.')).toBeTruthy()
  })
})
