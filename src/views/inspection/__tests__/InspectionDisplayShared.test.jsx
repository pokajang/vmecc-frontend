// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, within } from '@testing-library/react'
import {
  InspectionPhotoViewerModal,
  isCompactInspectionViewport,
} from '../form/components/InspectionDisplayShared'

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

describe('InspectionDisplayShared', () => {
  it('opens photo evidence viewer in the mobile drawer', () => {
    setMobileViewport()

    render(
      <InspectionPhotoViewerModal
        viewer={{
          title: 'Pump Panel photos',
          photos: [{ id: 'photo-1', fileName: 'pump-panel.jpg', url: 'data:image/png;base64,a' }],
          readOnly: true,
        }}
        onClose={vi.fn()}
      />,
    )

    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Pump Panel photos')).toBeTruthy()
    expect(within(drawer).getByText('1 photo')).toBeTruthy()
    expect(within(drawer).getByText('pump-panel.jpg')).toBeTruthy()
  })

  it('detects compact inspection viewport by the 575.98px media rule', () => {
    setMobileViewport()
    expect(isCompactInspectionViewport()).toBe(true)

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query) => ({
        matches: query !== '(max-width: 575.98px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    expect(isCompactInspectionViewport()).toBe(false)
  })
})
