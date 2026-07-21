import { describe, expect, it } from 'vitest'
import {
  firstErcoError,
  validateErcoAnalysis,
  validateErcoForm,
  validateErcoSetup,
} from '../validation'

const completeForm = {
  incidentType: 'Fire',
  weather: 'Clear',
  location: 'Zone 1 | Workshop',
  incidentDate: '2026-07-20',
  incidentTime: '09:00',
  respondingAttendance: [{ id: 'member-1', present: true }],
  details: 'Workshop fire',
  summary: 'The response team contained the fire.',
  chronology: [{ time: '09:05', action: 'Response team mobilised.' }],
  postIncidentAnalysis: {
    strengths: ['Prompt mobilisation'],
    photos: [{ mediaId: 'media-1', url: '/api/report-media/media-1' }],
  },
}

describe('ERCO validation', () => {
  it('requires a successfully uploaded photo before review or submission', () => {
    const result = validateErcoAnalysis({
      postIncidentAnalysis: { strengths: ['Prompt mobilisation'], photos: [] },
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.postIncidentPhotos).toBe('Upload at least one incident photograph.')
  })

  it('routes the user to the earliest incomplete stage', () => {
    const result = validateErcoForm(
      { ...completeForm, incidentType: '', postIncidentAnalysis: { strengths: [], photos: [] } },
      new Date(2026, 6, 21, 10, 0),
    )

    expect(firstErcoError(result.errors)).toEqual({ field: 'incidentType', stage: 'setup' })
    expect(result.errors).toMatchObject({
      incidentType: 'Incident type is required.',
      postIncidentStrengths: 'Select or add at least one strength.',
      postIncidentPhotos: 'Upload at least one incident photograph.',
    })
  })

  it('rejects future incident dates and same-day future times', () => {
    const now = new Date(2026, 6, 21, 10, 30)

    expect(
      validateErcoSetup({ ...completeForm, incidentDate: '2026-07-22' }, now).errors.incidentDate,
    ).toBe('Incident date cannot be in the future.')
    expect(
      validateErcoSetup({ ...completeForm, incidentDate: '2026-07-21', incidentTime: '10:31' }, now)
        .errors.incidentTime,
    ).toBe('Incident time cannot be in the future.')
  })
})
