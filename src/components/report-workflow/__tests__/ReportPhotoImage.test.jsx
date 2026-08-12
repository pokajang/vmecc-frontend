// @vitest-environment jsdom
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  PhotoPreview,
  PhotosGrid,
  ReportPhotoImage,
  resolvePhotoLabel,
} from '../ReportViewComponents'
import { normalizePhotos } from 'src/views/inspection/form/core/inspectionFormShared'
import { buildErcoRecord } from 'src/views/report/erco/recordFactory'

const managedPhoto = {
  id: 'photo-1',
  mediaId: 'rpm_test',
  url: '/api/report-media/rpm_test',
  thumbnailUrl: '/api/report-media/rpm_test?variant=thumbnail',
  fileName: 'DEVICE_PRIVATE_IMG_987654.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1234,
  width: 1280,
  height: 960,
  description: 'Evidence',
}

describe('managed report photo rendering', () => {
  it('loads the bounded thumbnail first and falls back to the full image', () => {
    render(<ReportPhotoImage photo={managedPhoto} alt="Evidence photo" />)
    const image = screen.getByRole('img', { name: 'Evidence photo' })

    expect(image.getAttribute('src')).toBe(managedPhoto.thumbnailUrl)
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('decoding')).toBe('async')

    fireEvent.error(image)
    expect(image.getAttribute('src')).toBe(managedPhoto.url)
  })

  it('loads the full image first when requested and falls back to the thumbnail', () => {
    render(<ReportPhotoImage photo={managedPhoto} preferFullSize alt="Full evidence photo" />)
    const image = screen.getByRole('img', { name: 'Full evidence photo' })

    expect(image.getAttribute('src')).toBe(managedPhoto.url)

    fireEvent.error(image)
    expect(image.getAttribute('src')).toBe(managedPhoto.thumbnailUrl)
  })

  it('preserves managed references through inspection and ERCO normalization', () => {
    expect(normalizePhotos([managedPhoto])[0]).toEqual(expect.objectContaining(managedPhoto))

    const record = buildErcoRecord({
      form: {
        incidentDate: '2026-07-10',
        incidentTime: '10:00',
        weather: 'Clear',
        incidentType: 'Fire',
        location: {},
        details: 'Details',
        detailsSource: 'manual',
        summary: 'Summary',
        respondingTeamName: '',
        respondingTeamShift: '',
        respondingAttendance: [],
        chronology: [],
        postIncidentAnalysis: {
          strengths: [],
          resourcesMobilised: [],
          improvementOpportunities: [],
          photos: [managedPhoto],
        },
      },
      reportTypeSlug: 'erco',
      reportTypeIdPrefix: 'ERCO',
      user: { id: 1, name: 'Tester' },
      sequence: 1,
    })

    expect(record.postIncidentAnalysis.photos[0]).toEqual(expect.objectContaining(managedPhoto))
  })

  it('uses caller-owned contextual labels without exposing the internal filename', () => {
    const label = resolvePhotoLabel({
      photo: { ...managedPhoto, description: '' },
      index: 1,
      contextLabel: 'Inspection evidence photo',
    })
    render(<PhotoPreview photo={managedPhoto} alt={label} />)

    expect(screen.getByRole('img', { name: 'Inspection evidence photo 2' })).toBeTruthy()
    expect(screen.queryByText(managedPhoto.fileName)).toBeNull()
    expect(screen.queryByRole('img', { name: managedPhoto.fileName })).toBeNull()
    expect(managedPhoto.fileName).toBe('DEVICE_PRIVATE_IMG_987654.jpg')
  })

  it('renders resolution evidence without a nested card or device filename', () => {
    const { container } = render(<PhotosGrid photos={[managedPhoto]} />)

    expect(screen.getByText('Uploaded Photos')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Evidence' })).toBeTruthy()
    expect(screen.getByText('Evidence')).toBeTruthy()
    expect(screen.queryByText(managedPhoto.fileName)).toBeNull()
    expect(container.querySelector('.card')).toBeNull()
  })
})
