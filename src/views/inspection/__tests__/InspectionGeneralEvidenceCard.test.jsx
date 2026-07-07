// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { InspectionGeneralEvidenceCard } from '../form/components/InspectionFormDisplaySections'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('InspectionGeneralEvidenceCard', () => {
  it('shows structured general evidence behind a compact mobile drawer action', () => {
    setMobileViewport()

    render(
      <InspectionGeneralEvidenceCard
        title="General Evidence Photos"
        photos={[]}
        compactOnMobile
        drawerDescription="Optional. Use this only for extra location photos not already attached to a unit defect."
        emptyMessage="No general evidence photos added."
      />,
    )

    expect(screen.getByText('Add photos (optional)')).toBeTruthy()
    expect(screen.queryByText('No general evidence photos added.')).toBeNull()

    fireEvent.click(screen.getByText('Add photos (optional)'))

    const drawerBody = document.querySelector('.inspection-general-evidence-drawer-body')
    expect(drawerBody).toBeTruthy()
    expect(within(drawerBody).getByRole('button', { name: 'Take photo' })).toBeTruthy()
    expect(within(drawerBody).getByRole('button', { name: 'Upload photo' })).toBeTruthy()
    expect(
      document
        .querySelector('.mobile-bottom-drawer__actions')
        ?.querySelector('[aria-label="Take photo"]'),
    ).toBeNull()
    expect(
      screen.getByText(
        'Optional. Use this only for extra location photos not already attached to a unit defect.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('No general evidence photos added.')).toBeTruthy()
  })

  it('keeps the existing card presentation outside compact mobile mode', () => {
    render(
      <InspectionGeneralEvidenceCard
        title="General Evidence Photos"
        photos={[]}
        emptyMessage="No general evidence photos added."
      />,
    )

    expect(screen.getByText('General Evidence Photos')).toBeTruthy()
    expect(screen.getByText('No general evidence photos added.')).toBeTruthy()
    expect(screen.queryByText('Add photos (optional)')).toBeNull()
  })
})
