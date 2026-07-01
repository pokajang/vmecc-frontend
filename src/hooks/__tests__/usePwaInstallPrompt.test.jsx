// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import usePwaInstallPrompt, {
  PWA_INSTALL_DISMISSED_KEY,
  PwaInstallProvider,
} from '../usePwaInstallPrompt'

const storageState = new Map()

const setNavigatorValue = (key, value) => {
  Object.defineProperty(window.navigator, key, {
    configurable: true,
    value,
  })
}

const configureEnvironment = ({
  userAgent = 'Mozilla/5.0 (Linux; Android 14)',
  platform = 'Linux armv8l',
  maxTouchPoints = 5,
  coarsePointer = true,
  narrowViewport = true,
  standalone = false,
} = {}) => {
  setNavigatorValue('userAgent', userAgent)
  setNavigatorValue('platform', platform)
  setNavigatorValue('maxTouchPoints', maxTouchPoints)

  window.matchMedia = vi.fn((query) => ({
    matches:
      query === '(pointer: coarse)'
        ? coarsePointer
        : query === '(max-width: 768px)'
          ? narrowViewport
          : query === '(display-mode: standalone)' || query === '(display-mode: fullscreen)'
            ? standalone
            : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const Harness = () => {
  const {
    canNativeInstall,
    dismissBanner,
    isInstalled,
    openInstallExperience,
    platformVariant,
    showBanner,
    showNavInstallItem,
  } = usePwaInstallPrompt()

  return (
    <>
      <div data-testid="platform">{platformVariant}</div>
      <div data-testid="show-banner">{String(showBanner)}</div>
      <div data-testid="show-nav">{String(showNavInstallItem)}</div>
      <div data-testid="native-install">{String(canNativeInstall)}</div>
      <div data-testid="installed">{String(isInstalled)}</div>
      <button type="button" onClick={() => void openInstallExperience()}>
        Open install
      </button>
      <button type="button" onClick={dismissBanner}>
        Dismiss banner
      </button>
    </>
  )
}

const renderHarness = () =>
  render(
    <PwaInstallProvider>
      <Harness />
    </PwaInstallProvider>,
  )

const clearDismissed = () => {
  storageState.delete(PWA_INSTALL_DISMISSED_KEY)
}

afterEach(() => {
  cleanup()
  clearDismissed()
})

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key) => (storageState.has(key) ? storageState.get(key) : null)),
      setItem: vi.fn((key, value) => {
        storageState.set(key, String(value))
      }),
      removeItem: vi.fn((key) => {
        storageState.delete(key)
      }),
      clear: vi.fn(() => {
        storageState.clear()
      }),
    },
  })
  configureEnvironment()
  clearDismissed()
})

describe('usePwaInstallPrompt', () => {
  it('calls the native prompt when available', async () => {
    const prompt = vi.fn(async () => ({ outcome: 'accepted' }))
    renderHarness()

    const installEvent = new Event('beforeinstallprompt')
    installEvent.preventDefault = vi.fn()
    installEvent.prompt = prompt
    window.dispatchEvent(installEvent)

    await waitFor(() => expect(screen.getByTestId('native-install').textContent).toBe('true'))

    fireEvent.click(screen.getByRole('button', { name: 'Open install' }))

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTestId('installed').textContent).toBe('true'))
    expect(screen.getByTestId('show-nav').textContent).toBe('false')
  })

  it('opens Apple instructions when native install is unavailable on iOS', async () => {
    configureEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      coarsePointer: true,
      narrowViewport: true,
    })

    renderHarness()

    expect(screen.getByTestId('platform').textContent).toBe('ios')
    fireEvent.click(screen.getByRole('button', { name: 'Open install' }))

    expect(
      await screen.findByText(/Apple does not allow websites to open the iPhone install prompt/i),
    ).toBeTruthy()
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy()
  })

  it('opens Android instructions when native install is unavailable on Android', async () => {
    renderHarness()

    expect(screen.getByTestId('platform').textContent).toBe('android')
    fireEvent.click(screen.getByRole('button', { name: 'Open install' }))

    expect(
      await screen.findByText(/Your browser does not have the one-tap install prompt/i),
    ).toBeTruthy()
    expect(screen.getByText(/Install app or Add to Home screen/i)).toBeTruthy()
  })

  it('opens desktop instructions when native install is unavailable on desktop', async () => {
    configureEnvironment({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
      coarsePointer: false,
      narrowViewport: false,
    })

    renderHarness()

    expect(screen.getByTestId('platform').textContent).toBe('desktop')
    expect(screen.getByTestId('show-banner').textContent).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Open install' }))

    expect(
      await screen.findByText(
        /This browser does not have the one-click install prompt available right now/i,
      ),
    ).toBeTruthy()
    expect(screen.getByText(/install icon in the address bar/i)).toBeTruthy()
  })

  it('hides only the banner when dismissed, while keeping the nav item available', async () => {
    renderHarness()

    expect(screen.getByTestId('show-banner').textContent).toBe('true')
    expect(screen.getByTestId('show-nav').textContent).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }))

    await waitFor(() => expect(screen.getByTestId('show-banner').textContent).toBe('false'))
    expect(screen.getByTestId('show-nav').textContent).toBe('true')
  })

  it('hides both banner and nav item after appinstalled', async () => {
    renderHarness()

    expect(screen.getByTestId('show-banner').textContent).toBe('true')
    expect(screen.getByTestId('show-nav').textContent).toBe('true')

    window.dispatchEvent(new Event('appinstalled'))

    await waitFor(() => expect(screen.getByTestId('installed').textContent).toBe('true'))
    expect(screen.getByTestId('show-banner').textContent).toBe('false')
    expect(screen.getByTestId('show-nav').textContent).toBe('false')
  })
})
