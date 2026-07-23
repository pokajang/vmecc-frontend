// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ResetPassword from '../ResetPassword'

afterEach(() => {
  cleanup()
})

describe('ResetPassword', () => {
  it('uses the scroll-safe auth layout', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=token-1&email=user@example.test']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>,
    )

    const shell = screen.getByTestId('reset-password-shell')
    expect(shell.style.minHeight).toBe('100dvh')
    expect(shell.style.height).toBe('')
    expect(shell.className).toContain('align-items-center')
    expect(shell.className).toContain('vmecc-scroll-y')

    const logo = screen.getByAltText('VMECC')
    expect(logo.style.getPropertyValue('--auth-logo-width')).toBe('clamp(68px, 16vw, 120px)')
    expect(logo.style.width).toBe('var(--auth-logo-width)')
  })
})
