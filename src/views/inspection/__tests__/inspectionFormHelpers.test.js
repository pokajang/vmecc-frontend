import { describe, expect, it } from 'vitest'
import {
  buildInspectionDraftPayload,
  buildInspectionPayloadSnapshot,
  buildInspectionReviewRecord,
  buildInspectionSubmittedRecord,
  getInspectionDraftMeta,
  isInspectionDraftPayload,
  normalizeInspectionForm,
  recordToInspectionForm,
  selectInspectionInitialForm,
} from '../inspectionFormHelpers'

const basePhotos = [
  {
    id: 'photo-1',
    fileName: 'photo-1.png',
    description: 'Pump pressure gauge photo.',
    url: 'data:image/png;base64,abc123',
  },
  {
    id: 'photo-2',
    fileName: 'photo-2.png',
    description: 'Valve condition photo.',
    url: 'data:image/png;base64,def456',
  },
]

const baseForm = {
  selectedLocation: 'Zone 1',
  inspectionType: 'Fire Water Pump House Inspection',
  description: 'Observed normal pressure and no leakage.',
  photos: basePhotos,
}

describe('inspectionFormHelpers', () => {
  it('normalizes persisted records into the single-summary form shape', () => {
    const form = recordToInspectionForm({
      selectedLocation: 'Zone 2',
      incidentType: 'Housekeeping / 5S Inspection',
      description: 'Bins labeled and floor clear.',
      photos: basePhotos,
    })

    expect(form).toEqual({
      selectedLocation: 'Zone 2',
      inspectionType: 'Housekeeping / 5S Inspection',
      description: 'Bins labeled and floor clear.',
      photos: basePhotos,
    })
  })

  it('attaches draft metadata and detects inspection-scoped drafts', () => {
    const payload = buildInspectionDraftPayload({
      form: baseForm,
      mode: 'edit',
      editReportId: 'report-ins-001',
    })

    expect(isInspectionDraftPayload(payload)).toBe(true)
    expect(getInspectionDraftMeta(payload)).toEqual({
      formVersion: 'inspection',
      mode: 'edit',
      editReportId: 'report-ins-001',
    })
  })

  it('prefers matching workspace over draft and record initialization sources', () => {
    const payload = buildInspectionDraftPayload({
      form: { ...baseForm, selectedLocation: 'Zone 3' },
      mode: 'edit',
      editReportId: 'report-ins-001',
    })

    const result = selectInspectionInitialForm({
      routeMode: 'edit',
      routeRecordId: 'report-ins-001',
      workspace: {
        mode: 'edit',
        recordId: 'report-ins-001',
        form: { ...baseForm, selectedLocation: 'Zone 4' },
      },
      draftPayload: payload,
      record: {
        id: 'report-ins-001',
        selectedLocation: 'Zone 2',
        incidentType: 'Chemical Safety Review',
        description: 'Original description',
        photos: [basePhotos[0]],
      },
    })

    expect(result.source).toBe('workspace')
    expect(result.form.selectedLocation).toBe('Zone 4')
  })

  it('builds one summary finding while preserving multiple photos', () => {
    const payload = buildInspectionPayloadSnapshot(baseForm)

    expect(payload.incidentType).toBe(baseForm.inspectionType)
    expect(payload.location).toBe(baseForm.selectedLocation)
    expect(payload.description).toBe(baseForm.description)
    expect(payload.photos).toEqual(basePhotos)
    expect(payload.findings).toHaveLength(1)
    expect(payload.findings[0].type).toBe(baseForm.inspectionType)
    expect(payload.findings[0].description).toBe(baseForm.description)
  })

  it('preserves per-image descriptions in normalized form and payload projection', () => {
    const form = normalizeInspectionForm({
      ...baseForm,
      photos: [
        {
          id: 'photo-1',
          fileName: 'photo-1.png',
          description: 'Detailed pump motor photo.',
          url: 'data:image/png;base64,abc123',
        },
      ],
    })

    expect(form.photos[0].description).toBe('Detailed pump motor photo.')

    const payload = buildInspectionPayloadSnapshot(form)
    expect(payload.photos[0].description).toBe('Detailed pump motor photo.')
  })

  it('preserves edit identity and version when building the review record', () => {
    const reviewRecord = buildInspectionReviewRecord({
      form: baseForm,
      mode: 'edit',
      editingRecord: {
        id: 'report-ins-001',
        displayId: 'INS-01-29042026',
        version: 5,
        revision: 2,
      },
      reportTypeSlug: 'inspection',
      reportTypeIdPrefix: 'INS',
      sequence: 3,
      user: { name: 'Inspector' },
    })

    expect(reviewRecord.id).toBe('report-ins-001')
    expect(reviewRecord.displayId).toBe('INS-01-29042026')
    expect(reviewRecord.photos).toEqual(basePhotos)
    expect(reviewRecord.findings).toHaveLength(1)
    expect(reviewRecord.status).toBe('Draft')
    expect(reviewRecord.submittedAt).toBe('')
    expect(reviewRecord.submittedBy).toBe('')
    expect(reviewRecord.version).toBe(5)
    expect(reviewRecord.revision).toBe(2)
  })

  it('stamps submitted metadata only when converting a review preview into a final submitted record', () => {
    const reviewRecord = buildInspectionReviewRecord({
      form: baseForm,
      mode: 'new',
      reportTypeSlug: 'inspection',
      reportTypeIdPrefix: 'INS',
      sequence: 3,
      user: { name: 'Inspector' },
    })

    expect(reviewRecord.status).toBe('Draft')
    expect(reviewRecord.submittedAt).toBe('')
    expect(reviewRecord.submittedBy).toBe('')

    const submittedRecord = buildInspectionSubmittedRecord(
      reviewRecord,
      { name: 'Jang' },
      '2026-04-29T06:00:00.000Z',
    )

    expect(submittedRecord.id).toBe(reviewRecord.id)
    expect(submittedRecord.displayId).toBe(reviewRecord.displayId)
    expect(submittedRecord.status).toBe('Submitted')
    expect(submittedRecord.submittedAt).toBe('2026-04-29T06:00:00.000Z')
    expect(submittedRecord.submittedBy).toBe('Jang')
  })

  it('preserves in-progress description whitespace in form state but trims it in payload projection', () => {
    const form = normalizeInspectionForm({
      selectedLocation: 'Zone 1',
      inspectionType: 'Chemical Safety Review',
      description: 'typed text ',
      photos: [basePhotos[0]],
    })

    expect(form.description).toBe('typed text ')

    const payload = buildInspectionPayloadSnapshot(form)
    expect(payload.description).toBe('typed text')
  })
})
