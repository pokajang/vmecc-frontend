// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReportPhotoGallery from '../ReportPhotoGallery'

const photos = [
  {
    id: 'photo-1',
    url: '/media/photo-1.jpg',
    thumbnailUrl: '/media/photo-1-thumbnail.jpg',
    description: 'Initial response position',
  },
  {
    id: 'photo-2',
    url: '/media/photo-2.jpg',
    thumbnailUrl: '/media/photo-2-thumbnail.jpg',
    description: 'Recovery complete',
  },
]

describe('ReportPhotoGallery', () => {
  it('opens the full-size photo and preserves the submitted sequence and descriptions', () => {
    render(<ReportPhotoGallery photos={photos} />)

    expect(screen.getByAltText('Initial response position').getAttribute('src')).toBe(
      '/media/photo-1-thumbnail.jpg',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'View photo 1: Initial response position',
      }),
    )

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('1 of 2')).toBeTruthy()
    expect(within(dialog).getByAltText('Initial response position').getAttribute('src')).toBe(
      '/media/photo-1.jpg',
    )
    expect(
      within(dialog)
        .getByRole('button', { name: 'Fit photo to viewer' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(within(dialog).getByRole('button', { name: 'View photo at original size' }))
    expect(within(dialog).getByAltText('Initial response position').className).toContain(
      'report-photo-viewer__image--original',
    )
    expect(
      within(dialog)
        .getByRole('button', { name: 'View photo at original size' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next photo' }))
    expect(within(dialog).getByText('2 of 2')).toBeTruthy()
    expect(within(dialog).getByAltText('Recovery complete').getAttribute('src')).toBe(
      '/media/photo-2.jpg',
    )
  })
})
