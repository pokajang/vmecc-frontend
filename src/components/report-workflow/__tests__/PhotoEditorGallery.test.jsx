// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PhotoEditorGallery from '../PhotoEditorGallery'

afterEach(cleanup)

const photos = [
  {
    id: 'photo-1',
    fileName: 'command-position.jpg',
    url: '/report-media/photo-1',
    description: '',
  },
  {
    id: 'photo-2',
    fileName: 'long-operational-evidence-file-name.jpg',
    url: '/report-media/photo-2',
    description: 'Crew assembled',
  },
]

describe('PhotoEditorGallery', () => {
  it('keeps descriptions collapsed until the selected photo is edited', () => {
    const onChangeDescription = vi.fn()
    render(<PhotoEditorGallery photos={photos} onChangeDescription={onChangeDescription} />)

    expect(screen.getByText('Photo 1 of 2')).toBeTruthy()
    expect(screen.getByText('Photo 2 of 2')).toBeTruthy()
    expect(screen.getByText('Description added')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()

    const editButton = screen.getByRole('button', {
      name: 'Edit description for Photo 1',
    })
    fireEvent.click(editButton)

    const description = screen.getByRole('textbox', {
      name: 'Description for Photo 1',
    })
    expect(document.activeElement).toBe(description)
    fireEvent.change(description, { target: { value: 'Command position established' } })

    expect(onChangeDescription).toHaveBeenCalledWith(photos[0], 'Command position established', 0)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Done editing description for Photo 1',
      }),
    )
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.activeElement).toBe(editButton)
  })

  it('exposes compact removal and optional caption actions', () => {
    const onRemove = vi.fn()
    const onApplyCaption = vi.fn()
    render(
      <PhotoEditorGallery
        photos={photos}
        onRemove={onRemove}
        onChangeDescription={vi.fn()}
        onApplyCaption={onApplyCaption}
        captionOptions={['Before corrective action']}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo 2' }))
    expect(onRemove).toHaveBeenCalledWith(photos[1], 1)

    fireEvent.click(screen.getByRole('button', { name: 'Edit description for Photo 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Before corrective action' }))
    expect(onApplyCaption).toHaveBeenCalledWith(photos[0], 'Before corrective action', 0)
  })

  it('preserves duplicate rows and clears stale editor state when a photo disappears', () => {
    const duplicatePhotos = [
      { fileName: 'evidence.jpg', description: '' },
      { fileName: 'evidence.jpg', description: '' },
    ]
    const onRemove = vi.fn()
    const { rerender } = render(
      <PhotoEditorGallery
        photos={duplicatePhotos}
        onChangeDescription={vi.fn()}
        onRemove={onRemove}
      />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Edit description for Photo 2' }))
    expect(screen.getByRole('textbox', { name: 'Description for Photo 2' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo 2' }))
    expect(onRemove).toHaveBeenCalledWith(duplicatePhotos[1], 1)
    expect(screen.queryByRole('textbox')).toBeNull()

    rerender(
      <PhotoEditorGallery
        photos={[duplicatePhotos[0]]}
        onChangeDescription={vi.fn()}
        onRemove={onRemove}
      />,
    )
    rerender(
      <PhotoEditorGallery
        photos={duplicatePhotos}
        onChangeDescription={vi.fn()}
        onRemove={onRemove}
      />,
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
