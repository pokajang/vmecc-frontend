import { describe, expect, it } from 'vitest'
import { ER_ASSESSMENT_TYPES } from '../constants'
import {
  createEmptyErAssessmentForm,
  normalizeErAssessmentForm,
  selectErAssessmentType,
} from '../erAssessmentFormDomain'
import { buildErAssessmentRecord } from '../recordFactory'
import { validateErAssessmentForm, validateErAssessmentStep } from '../validation'

const completeForm = () => {
  let form = selectErAssessmentType(createEmptyErAssessmentForm(), 'working-at-height')
  form = {
    ...form,
    company: 'VMECC',
    assessmentDate: '2026-08-27',
    location: 'Process Area A',
    scopeOfWork: 'Replace elevated lighting.',
    responses: form.responses.map((row) => ({ ...row, response: 'Yes' })),
    rescuePlan: 'Raise alarm, recover using the rescue kit, and transfer to the clinic.',
    rescueAccessLayout: {
      name: 'layout.png',
      type: 'image/png',
      url: 'data:image/png;base64,AA==',
    },
    rescueEquipment: ['Rescue kit', 'Stretcher'],
    inspectedBy: { name: 'Inspector One', company: 'VMECC', signature: 'Inspector One' },
    jobLeader: { name: 'Leader One', company: 'Vendor', signature: 'Leader One' },
  }
  return form
}

describe('ER Assessment domain', () => {
  it('loads the exact requirement count for every document assessment type', () => {
    ER_ASSESSMENT_TYPES.forEach((type) => {
      const form = selectErAssessmentType(createEmptyErAssessmentForm(), type.value)
      expect(form.responses).toHaveLength(type.requirements.length)
      expect(form.responses.map((row) => row.requirement)).toEqual(type.requirements)
      expect(form.responses.map((row) => row.requirementId)).toEqual(type.requirementIds)
    })
  })

  it('requires remarks when a readiness response is No', () => {
    const form = completeForm()
    form.responses[1] = { ...form.responses[1], response: 'No', remarks: '' }

    const result = validateErAssessmentStep(form, 'requirements')

    expect(result.isValid).toBe(false)
    expect(result.errors['remarks-1']).toMatch(/Gap and immediate action/)
  })

  it('preserves optional managed evidence on the canonical No-response row', () => {
    const normalized = normalizeErAssessmentForm({
      assessmentType: 'working-at-height',
      responses: [
        {
          requirementId: 'wah.scaffold-tagged',
          response: 'No',
          remarks: 'Tag is expired; isolate access.',
          photos: [
            {
              mediaId: 'rpm-er-evidence-1',
              url: '/api/report-media/rpm-er-evidence-1',
              thumbnailUrl: '/api/report-media/rpm-er-evidence-1?variant=thumbnail',
              fileName: 'device-photo.jpg',
              description: 'Expired scaffold tag.',
            },
          ],
        },
      ],
    })

    expect(normalized.responses[0].photos).toEqual([
      expect.objectContaining({
        mediaId: 'rpm-er-evidence-1',
        description: 'Expired scaffold tag.',
      }),
    ])
    expect(normalized.responses[1].photos).toEqual([])
  })

  it('requires rescue layout, equipment, and both sign-offs before review', () => {
    const form = completeForm()
    form.rescueAccessLayout = null
    form.rescueEquipment = ['']
    form.jobLeader.signature = ''

    const result = validateErAssessmentForm(form)

    expect(result.errors.rescueAccessLayout).toBeTruthy()
    expect(result.errors.rescueEquipment).toBeTruthy()
    expect(result.errors['jobLeader.signature']).toBeTruthy()
  })

  it('builds a shared report-shell record without losing the assessment payload', () => {
    const record = buildErAssessmentRecord({
      form: completeForm(),
      user: { id: 12, name: 'Assessment User' },
      idPrefix: 'ERA',
      sequence: 3,
    })

    expect(record.reportType).toBe('er-assessment')
    expect(record.displayId).toMatch(/^ERA-03-/)
    expect(record.incidentType).toBe('Working at Height')
    expect(record.responses).toHaveLength(6)
    expect(record.responses[0].requirementId).toBe('wah.scaffold-tagged')
    expect(record.rescueEquipment).toEqual(['Rescue kit', 'Stretcher'])
  })

  it('normalizes shared record aliases back into an editable assessment', () => {
    const normalized = normalizeErAssessmentForm({
      incidentType: 'Working at Height',
      reportDate: '2026-08-27',
      details: 'Elevated repair',
      summary: 'Use rope rescue.',
    })

    expect(normalized.assessmentType).toBe('working-at-height')
    expect(normalized.scopeOfWork).toBe('Elevated repair')
    expect(normalized.rescuePlan).toBe('Use rope rescue.')
  })
})
