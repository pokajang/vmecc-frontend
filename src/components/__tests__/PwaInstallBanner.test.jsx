// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import PwaInstallBanner from '../PwaInstallBanner'

afterEach(() => cleanup())

const renderBanner = (installPromptState) => {
  const useInstallPrompt = () => installPromptState

  render(<PwaInstallBanner useInstallPrompt={useInstallPrompt} />)
}

describe('PwaInstallBanner', () => {
  it('stays hidden when the banner should not be shown', () => {
    renderBanner({
      showBanner: false,
      platformVariant: 'android',
      openInstallExperience: vi.fn(),
      dismissBanner: vi.fn(),
    })

    expect(screen.queryByText(/Install VMECC/i)).toBeNull()
  })

  it('renders the shared install button for Android users', () => {
    const openInstallExperience = vi.fn()

    renderBanner({
      showBanner: true,
      platformVariant: 'android',
      openInstallExperience,
      dismissBanner: vi.fn(),
    })

    expect(screen.getByRole('button', { name: 'Install VMECC' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Install VMECC' }))
    expect(openInstallExperience).toHaveBeenCalledTimes(1)
  })

  it('renders the shared install button for iOS users', () => {
    const openInstallExperience = vi.fn()

    renderBanner({
      showBanner: true,
      platformVariant: 'ios',
      openInstallExperience,
      dismissBanner: vi.fn(),
    })

    expect(screen.getByText(/Install VMECC on your iPhone/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Install VMECC' }))
    expect(openInstallExperience).toHaveBeenCalledTimes(1)
  })
})
