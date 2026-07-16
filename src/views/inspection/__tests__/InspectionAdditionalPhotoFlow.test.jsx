// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionItemAdditionalInfo from '../form/components/InspectionItemAdditionalInfo'
import { ScbaAdditionalInfo } from '../form/components/ScbaSectionSupport'
import { FireExtinguisherRowDetails } from '../types/fire-extinguisher/fireExtinguisherCheckCards'
import { FIRE_EXTINGUISHER_CHECK_FIELDS } from '../types/fire-extinguisher/helpers'

afterEach(cleanup)

const completeRequestedUpload = (requestMock, photo, optionsIndex) => {
  const options = requestMock.mock.calls[0][optionsIndex]
  expect(options.currentPhotos).toEqual([])
  options.onAfterAddPhotos({ photos: [photo] })
}

describe('inspection additional photo flow', () => {
  it('opens the description viewer after shared item photos upload', () => {
    const row = { id: 'ROW-1', equipment: 'Rescue rope', additionalPhotos: [] }
    const onRequestPhotoUpload = vi.fn()
    const setPhotoViewer = vi.fn()
    const photo = { id: 'photo-1', url: '/photo-1.jpg' }

    render(
      <InspectionItemAdditionalInfo
        row={row}
        photosKey="additionalPhotos"
        setPhotoViewer={setPhotoViewer}
        onRequestPhotoUpload={onRequestPhotoUpload}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Photo' }))
    expect(onRequestPhotoUpload).toHaveBeenCalledWith(row, 'additionalPhotos', expect.any(Object))

    completeRequestedUpload(onRequestPhotoUpload, photo, 2)
    expect(setPhotoViewer).toHaveBeenCalledWith(
      expect.objectContaining({ photos: [photo], showDescriptionInput: true }),
    )
  })

  it('opens the description viewer after fire extinguisher additional photos upload', () => {
    const row = FIRE_EXTINGUISHER_CHECK_FIELDS.reduce(
      (nextRow, field) => ({ ...nextRow, [field.key]: field.options[0] }),
      { id: 'FE-1', idLocNo: 'FE-1', photos: [] },
    )
    const onRequestPhotoUpload = vi.fn()
    const onViewPhotos = vi.fn()
    const photo = { id: 'fire-photo', url: '/fire-photo.jpg' }

    render(
      <FireExtinguisherRowDetails
        row={row}
        handlers={{ onRequestPhotoUpload }}
        onViewPhotos={onViewPhotos}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Photo' }))
    expect(onRequestPhotoUpload).toHaveBeenCalledWith(row, expect.any(Object))

    completeRequestedUpload(onRequestPhotoUpload, photo, 1)
    expect(onViewPhotos).toHaveBeenCalledWith(
      expect.objectContaining({ photos: [photo], showDescriptionInput: true }),
    )
  })

  it('opens the description viewer after SCBA additional photos upload', () => {
    const row = { id: 'SCBA-1', serialNo: 'SCBA-1', photos: [] }
    const onRequestPhotoUpload = vi.fn()
    const setPhotoViewer = vi.fn()
    const photo = { id: 'scba-photo', url: '/scba-photo.jpg' }

    render(
      <ScbaAdditionalInfo
        sectionKey="cylinders"
        row={row}
        onRequestPhotoUpload={onRequestPhotoUpload}
        setPhotoViewer={setPhotoViewer}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Photo' }))
    expect(onRequestPhotoUpload).toHaveBeenCalledWith('cylinders', row, expect.any(Object))

    completeRequestedUpload(onRequestPhotoUpload, photo, 2)
    expect(setPhotoViewer).toHaveBeenCalledWith(
      expect.objectContaining({ photos: [photo], showDescriptionInput: true }),
    )
  })
})
