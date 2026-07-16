// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import {
  InspectionPhotoViewerModal,
  PhotoGallery,
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
  it('marks portrait and landscape previews for uncropped rendering', () => {
    const { container } = render(
      <PhotoGallery
        readOnly
        photos={[
          {
            id: 'landscape-photo',
            fileName: 'landscape.jpg',
            url: 'data:image/png;base64,landscape',
            width: 1600,
            height: 900,
          },
          {
            id: 'portrait-photo',
            fileName: 'portrait.jpg',
            url: 'data:image/png;base64,portrait',
            width: 900,
            height: 1600,
          },
        ]}
      />,
    )

    const previews = container.querySelectorAll('.workflow-photo-preview--uncropped')
    expect(previews).toHaveLength(2)
    expect(previews[0].className).toBe('workflow-photo-preview workflow-photo-preview--uncropped')
    expect(previews[0].querySelector('img')?.getAttribute('src')).toContain('landscape')
    expect(previews[1].querySelector('img')?.getAttribute('src')).toContain('portrait')
  })

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

  it('passes the current drawer photos to Add more photo', () => {
    setMobileViewport()
    const onAddMorePhoto = vi.fn()
    const photos = [{ id: 'photo-1', fileName: 'pump-panel.jpg', url: 'data:image/png;base64,a' }]

    render(
      <InspectionPhotoViewerModal
        viewer={{
          title: 'Pump Panel photos',
          photos,
          onAddMorePhoto,
        }}
        onClose={vi.fn()}
      />,
    )

    const drawer = document.querySelector('.offcanvas')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add more photo' }))

    expect(onAddMorePhoto).toHaveBeenCalledWith(photos)
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
