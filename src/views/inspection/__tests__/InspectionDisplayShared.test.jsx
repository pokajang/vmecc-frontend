// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('uses the full-width drawer editor with collapsed descriptions and compact actions', () => {
    const onChangeDescription = vi.fn()
    const onRemove = vi.fn()
    const photos = [
      {
        id: 'photo-1',
        fileName: 'first.jpg',
        url: 'data:image/png;base64,full-first',
        thumbnailUrl: 'data:image/png;base64,thumb-first',
        description: 'Existing description',
      },
      {
        id: 'photo-2',
        fileName: 'second.jpg',
        url: 'data:image/png;base64,full-second',
        thumbnailUrl: 'data:image/png;base64,thumb-second',
        description: '',
      },
    ]

    const { container } = render(
      <PhotoGallery
        presentation="drawer-editor"
        photos={photos}
        onChangeDescription={onChangeDescription}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('Photo 1 of 2')).toBeTruthy()
    expect(screen.getByText('Photo 2 of 2')).toBeTruthy()
    expect(screen.getByText('Description added')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toContain('full-first')

    fireEvent.click(screen.getByRole('button', { name: 'Edit description for Photo 1' }))
    const description = screen.getByLabelText('Description for Photo 1')
    expect(description.value).toBe('Existing description')
    fireEvent.change(description, { target: { value: 'Updated description' } })
    expect(onChangeDescription).toHaveBeenCalledWith('photo-1', 'Updated description')

    fireEvent.click(screen.getByRole('button', { name: 'Done editing description for Photo 1' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Edit description for Photo 1' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo 2' }))
    expect(onRemove).toHaveBeenCalledWith('photo-2')
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

  it('uses the drawer editor presentation only for an editable mobile photo viewer', () => {
    setMobileViewport()

    render(
      <InspectionPhotoViewerModal
        viewer={{
          title: 'Pump Panel photos',
          photos: [
            {
              id: 'photo-1',
              fileName: 'pump-panel.jpg',
              url: 'data:image/png;base64,a',
            },
          ],
          onChangeDescription: vi.fn(),
          onRemove: vi.fn(),
          onSave: vi.fn(),
        }}
        onClose={vi.fn()}
      />,
    )

    const drawer = document.querySelector('.offcanvas')
    expect(within(drawer).getByText('Photo 1 of 1')).toBeTruthy()
    expect(
      within(drawer).getByRole('button', { name: 'Edit description for Photo 1' }),
    ).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Remove Photo 1' })).toBeTruthy()
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
