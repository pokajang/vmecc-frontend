import { describe, expect, it } from 'vitest'
import {
  appendInspectionText,
  buildInspectionDraftPayload,
  buildInspectionPayloadSnapshot,
  createInspectionFormSignature,
  buildInspectionReviewRecord,
  buildInspectionSubmittedRecord,
  formatInspectionRole,
  formatInspectionLocation,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  getFrtCheckSummary,
  getInspectionChecklistChips,
  getInspectionFormValidationState,
  getInspectionFormMissingFields,
  getInspectionDraftMeta,
  getHydraulicCheckSummary,
  getHydraulicRetainedEvidenceFields,
  getHighAngleCheckSummary,
  getHighAngleRetainedEvidenceRows,
  getScbaCheckSummary,
  getScbaFieldEvidenceKeys,
  isInspectionDraftPayload,
  isInspectionChecklistItemSelected,
  normalizeInspectionForm,
  recordToInspectionForm,
  selectInspectionInitialForm,
  splitLegacyInspectionLocation,
  toggleHseSelection,
  toggleInspectionChecklistItem,
} from '../inspectionFormHelpers'
import { normalizeReportRecord } from '../inspectionSharedUtils'
import {
  FRT_DAILY_SECTION_DEFINITIONS,
  FRT_ONE_OFF_SECTION_DEFINITIONS,
  getFrtCompartmentOptions,
} from '../types/frt-daily/helpers'
import { getErAuxCheckSummary } from '../types/er-aux/helpers'
import {
  filterFireExtinguisherRows,
  getFireExtinguisherCheckSummary,
  getFireExtinguisherVisibleChecks,
  normalizeFireExtinguisherChecks,
} from '../types/fire-extinguisher/helpers'
import {
  HIGH_ANGLE_CONDITION_FIELD,
  HIGH_ANGLE_KIT_DEFINITIONS,
  getHighAngleVisibleChecks,
} from '../types/high-angle/helpers'
import { getHydraulicVisibleChecks } from '../types/hydraulic/helpers'
import { getScbaVisibleSections, SCBA_SECTION_DEFINITIONS } from '../types/scba/helpers'

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
  inspectionType: 'Hydraulic Rescue Tools Inspection',
  inspectedAt: '2026-06-29T09:30',
  description: 'Observed normal physical condition and no leakage.',
  photos: basePhotos,
}

describe('inspectionFormHelpers', () => {
  it('normalizes persisted records into the single-summary form shape', () => {
    const form = recordToInspectionForm({
      selectedLocation: 'Zone 2',
      incidentType: 'ER Aux Equipment Inspection',
      description: 'Equipment quantity and condition recorded.',
      photos: basePhotos,
    })

    expect(form).toEqual({
      selectedLocation: 'Zone 2',
      zone: '',
      zoneId: '',
      mainLocation: 'Zone 2',
      subLocation: '',
      mainLocationId: '',
      subLocationId: '',
      inspectionType: 'ER Aux Equipment Inspection',
      inspectedAt: '',
      description: 'Equipment quantity and condition recorded.',
      photos: basePhotos,
      checklist: [],
      inspectionActor: null,
      submittedByRole: '',
      submittedByRoleCode: '',
      inspectionIssues: [],
      inspectionTypeDrafts: {},
      erAuxInspectedBy: '',
      erAuxInspectionDate: '',
      erAuxChecks: [],
      erAuxEquipmentRows: [],
      fireExtinguisherInspectedBy: '',
      fireExtinguisherInspectionDate: '',
      fireExtinguisherChecks: [],
      fireExtinguisherCatalogRows: [],
      fireExtinguisherEntryMode: '',
      fireExtinguisherFocusedAssetKey: '',
      fireExtinguisherScannedLocator: '',
      frtInspectedBy: '',
      frtInspectionDate: '',
      frtShift: '',
      frtTruckId: '',
      frtTruckPlateNo: '',
      frtTruckReference: {
        truckId: '',
        name: '',
        plateNo: 'AJG9555',
        roadTaxExpiry: '13/02/2026',
        insuranceExpiry: '13/02/2026',
        puspakomExpiry: '19/02/2026',
      },
      frtDailyChecks: [],
      frtDailyRemarks: '',
      frtOneOffChecks: [],
      frtOneOffRemarks: '',
      highAngleInspectedBy: '',
      highAngleInspectionDate: '',
      highAngleCustomMainLocations: [],
      highAngleCustomCompartments: [],
      highAngleChecks: [],
      scbaInspectedBy: '',
      scbaInspectionDate: '',
      scbaBackPlateChecks: [],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      scbaCustomSections: [],
      hseInspectedBy: '',
      hseInspectionDate: '',
      hseSelections: [],
      hseAreaConditionRemarks: '',
      hseUnsafeActDetails: '',
      hseUnsafeConditionDetails: '',
      hseEnvironmentalDetails: '',
      hseSeverity: '',
      hseImmediateAction: '',
      hseCorrectiveAction: '',
      hseResponsiblePerson: '',
      hseTargetDate: '',
      hseRemarks: '',
      hydraulicChecks: [],
      hydraulicEquipmentRows: [],
    })
  })

  it('infers fire extinguisher zone from saved rows when legacy records have only area and location', () => {
    const form = recordToInspectionForm({
      incidentType: 'Fire Extinguisher Inspection',
      selectedLocation: 'Manjung Hub > Reception',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          zone: 'Zone 1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
        },
      ],
    })

    expect(form).toEqual(
      expect.objectContaining({
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Zone 1 > Manjung Hub > Reception',
      }),
    )
  })

  it('preserves a selected fire extinguisher zone before a main area is selected', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'Fire Extinguisher Inspection',
      zone: '1',
      mainLocation: '',
      subLocation: '',
    })

    expect(form).toEqual(
      expect.objectContaining({
        zone: '1',
        mainLocation: '',
        subLocation: '',
        selectedLocation: 'Zone 1',
      }),
    )
  })

  it('normalizes shared inspection date/time and derives it from legacy session dates', () => {
    const empty = selectInspectionInitialForm({}).form
    expect(empty.inspectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

    const canonical = normalizeInspectionForm({
      mainLocation: 'FIRE TRUCK',
      inspectionType: 'FRT Daily Inspection',
      inspectedAt: '2026-07-01T09:45',
    })
    expect(canonical.inspectedAt).toBe('2026-07-01T09:45')
    expect(canonical.frtInspectionDate).toBe('2026-07-01')

    const legacyDateFields = [
      ['erAuxInspectionDate', 'ER Aux Equipment Inspection'],
      ['fireExtinguisherInspectionDate', 'Fire Extinguisher Inspection'],
      ['frtInspectionDate', 'FRT Daily Inspection'],
      ['highAngleInspectionDate', 'High Angle Rescue Equipment Inspection'],
      ['scbaInspectionDate', 'SCBA Inspection'],
      ['hseInspectionDate', 'Health Safety Environment Inspection'],
    ]

    legacyDateFields.forEach(([field, inspectionType]) => {
      const form = normalizeInspectionForm({
        inspectionType,
        [field]: '2026-06-28',
      })
      expect(form.inspectedAt).toBe('2026-06-28T00:00')
    })
  })

  it('hydrates hydraulic checks from API record payloads using snake or camel case', () => {
    const camelRecord = normalizeReportRecord({
      id: 'report-hydraulic-1',
      displayId: 'INS-HYD-001',
      report_type: 'inspection',
      payload: {
        incidentType: 'Hydraulic Rescue Tools Inspection',
        location: 'FRT',
        hydraulicChecks: [
          {
            id: 'frt:hydraulic-pump-motor-1',
            location: 'FRT',
            equipment: 'Hydraulic Pump Motor 1',
            functionTest: 'Defect',
          },
        ],
      },
    })
    const snakeRecord = normalizeReportRecord({
      id: 'report-hydraulic-2',
      displayId: 'INS-HYD-002',
      report_type: 'inspection',
      payload: {
        incidentType: 'Hydraulic Rescue Tools Inspection',
        location: 'Store',
        hydraulic_checks: [
          {
            id: 'store:hydraulic-cutter-2',
            location: 'Store',
            equipment: 'Hydraulic Cutter 2',
            physicalCondition: 'N/A',
            no_leakage: 'Defect',
            no_leakage_remarks: 'Minor hose seepage.',
            no_leakage_photos: [
              {
                id: 'leak-photo-1',
                description: 'Leakage defect evidence',
                url: 'data:image/png;base64,abc123',
              },
            ],
          },
        ],
      },
    })

    expect(camelRecord.hydraulicChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Hydraulic Pump Motor 1',
        functionTest: 'Defect',
      }),
    )
    expect(snakeRecord.hydraulicChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Hydraulic Cutter 2',
        physicalCondition: 'N/A',
      }),
    )
    expect(recordToInspectionForm(snakeRecord).hydraulicChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Hydraulic Cutter 2',
        noLeakage: 'Defect',
        noLeakageRemarks: 'Minor hose seepage.',
        noLeakagePhotos: [
          expect.objectContaining({
            id: 'leak-photo-1',
            description: 'Leakage defect evidence',
          }),
        ],
      }),
    )
  })

  it('preserves in-progress spaces in hydraulic remarks while normalizing form edits', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      mainLocation: 'FRT',
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          noLeakage: 'Defect',
          noLeakageRemarks: 'minor leak ',
          remarks: 'general note ',
        },
      ],
    })

    expect(form.hydraulicChecks[0].noLeakageRemarks).toBe('minor leak ')
    expect(form.hydraulicChecks[0].remarks).toBe('general note ')
  })

  it('preserves in-progress spaces in ER Aux remarks while normalizing form edits', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'ER Aux Equipment Inspection',
      mainLocation: 'Office',
      erAuxChecks: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          quantity: '7',
          condition: 'Defect',
          defectRemarks: 'makan nasi ',
          additionalNotes: 'optional note ',
        },
      ],
    })

    expect(form.erAuxChecks[0].defectRemarks).toBe('makan nasi ')
    expect(form.erAuxChecks[0].additionalNotes).toBe('optional note ')
  })

  it('persists separate General Inspection issues while dropping blank draft issue cards', () => {
    const payload = buildInspectionPayloadSnapshot({
      inspectionType: 'General Inspection',
      inspectedAt: '2026-07-05T10:00',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      description: 'General walkdown completed.',
      inspectionIssues: [
        {
          id: 'issue-1',
          description: 'Blocked emergency exit.',
          actionRequired: 'Remove stored items.',
          photos: [
            {
              id: 'photo-1',
              fileName: 'blocked-exit.jpg',
              description: 'Blocked exit evidence',
              url: 'data:image/jpeg;base64,abc123',
            },
          ],
        },
        {
          id: 'issue-2',
          description: '',
          actionRequired: '',
          photos: [],
        },
      ],
      photos: [],
    })

    expect(payload.inspectionIssues).toEqual([
      expect.objectContaining({
        id: 'issue-1',
        description: 'Blocked emergency exit.',
        actionRequired: 'Remove stored items.',
        photos: [
          expect.objectContaining({
            id: 'photo-1',
            description: 'Blocked exit evidence',
          }),
        ],
      }),
    ])
    expect(payload.issues).toEqual(payload.inspectionIssues)
  })

  it('requires a description when a General or HSE issue card has other evidence', () => {
    const generalState = getInspectionFormValidationState({
      inspectionType: 'General Inspection',
      inspectedAt: '2026-07-05T10:00',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      description: 'General walkdown completed.',
      inspectionIssues: [
        {
          id: 'issue-1',
          description: '',
          actionRequired: 'Follow up with housekeeping.',
          photos: [],
        },
      ],
      photos: [],
    })

    const hseState = getInspectionFormValidationState({
      inspectionType: 'Health Safety Environment Inspection',
      inspectedAt: '2026-07-05T10:00',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      description: 'HSE observation completed.',
      hseSelections: ['area-condition'],
      hseAreaConditionRemarks: 'Area checked.',
      inspectionIssues: [
        {
          id: 'issue-2',
          description: '',
          actionRequired: '',
          photos: [{ id: 'photo-2', description: 'Issue evidence' }],
        },
      ],
      photos: [],
    })

    expect(generalState.inspectionIssues).toEqual(
      expect.objectContaining({
        errorCount: 1,
        firstTarget: { field: 'inspectionIssues', issueId: 'issue-1' },
      }),
    )
    expect(generalState.errorCount).toBeGreaterThanOrEqual(1)
    expect(hseState.inspectionIssues).toEqual(
      expect.objectContaining({
        errorCount: 1,
        firstTarget: { field: 'inspectionIssues', issueId: 'issue-2' },
      }),
    )
  })

  it('only treats legacy issues arrays as separate issue cards for General and HSE forms', () => {
    expect(
      normalizeInspectionForm({
        inspectionType: 'Health Safety Environment Inspection',
        issues: [{ id: 'issue-1', description: 'Loose cable.' }],
      }).inspectionIssues,
    ).toEqual([expect.objectContaining({ id: 'issue-1', description: 'Loose cable.' })])

    expect(
      normalizeInspectionForm({
        inspectionType: 'High Angle Rescue Equipment Inspection',
        issues: [
          { id: 'legacy-row-issue', description: 'Do not treat as General/HSE issue card.' },
        ],
      }).inspectionIssues,
    ).toEqual([])
  })

  it('formats and splits hierarchical inspection locations', () => {
    expect(
      formatInspectionLocation({ mainLocation: 'Manjung Hub', subLocation: 'Reception' }),
    ).toBe('Manjung Hub > Reception')
    expect(splitLegacyInspectionLocation('Manjung Hub > Reception')).toEqual({
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
    })
    expect(normalizeInspectionForm({ selectedLocation: 'Manjung Hub > Reception' })).toEqual(
      expect.objectContaining({
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Manjung Hub > Reception',
      }),
    )
    expect(normalizeInspectionForm({ location_path: ['Office', 'Meeting Room'] })).toEqual(
      expect.objectContaining({
        mainLocation: 'Office',
        subLocation: 'Meeting Room',
        selectedLocation: 'Office > Meeting Room',
      }),
    )
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
        incidentType: 'SCBA Inspection',
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
    expect(payload.mainLocation).toBe(baseForm.selectedLocation)
    expect(payload.subLocation).toBe('')
    expect(payload.locationPath).toEqual([baseForm.selectedLocation])
    expect(payload.description).toBe(baseForm.description)
    expect(payload.photos).toEqual(basePhotos)
    expect(payload.checklist).toEqual([])
    expect(payload.hydraulicChecks).toEqual([])
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

  it('keeps edited ER Aux submitted subsets intact through review and update submission', () => {
    const submittedRecord = {
      id: 'report-eraux-001',
      displayId: 'INS-ERAUX-001',
      version: 3,
      revision: 1,
      mainLocation: 'Store',
      inspectedAt: '2026-07-03T07:10',
      incidentType: 'ER Aux Equipment Inspection',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'store:fire-jacket',
          location: 'Store',
          equipment: 'Fire Jacket',
          defaultQuantity: '15',
        },
        {
          id: 'store:animal-catcher-net',
          location: 'Store',
          equipment: 'Animal catcher net',
          defaultQuantity: '3',
        },
      ],
      erAuxChecks: [
        {
          id: 'store:fire-jacket',
          location: 'Store',
          equipment: 'Fire Jacket',
          quantity: '15',
          condition: 'OK',
        },
      ],
      photos: [],
    }
    const initial = selectInspectionInitialForm({
      routeMode: 'edit',
      routeRecordId: 'report-eraux-001',
      record: submittedRecord,
    })

    const reviewRecord = buildInspectionReviewRecord({
      form: {
        ...initial.form,
        erAuxChecks: [
          {
            ...initial.form.erAuxChecks[0],
            condition: 'Missing',
            additionalNotes: 'Replacement requested.',
          },
        ],
      },
      mode: 'edit',
      editingRecord: submittedRecord,
      reportTypeSlug: 'inspection',
      reportTypeIdPrefix: 'INS',
      sequence: 10,
      user: { name: 'Inspector Aux' },
    })
    const updatedRecord = buildInspectionSubmittedRecord(
      reviewRecord,
      { name: 'Inspector Aux' },
      '2026-07-08T09:30:00.000Z',
    )

    expect(initial.form.erAuxChecks).toHaveLength(1)
    expect(reviewRecord.id).toBe('report-eraux-001')
    expect(reviewRecord.version).toBe(3)
    expect(reviewRecord.erAuxChecks).toEqual([
      expect.objectContaining({
        id: 'store:fire-jacket',
        condition: 'Missing',
        additionalNotes: 'Replacement requested.',
      }),
    ])
    expect(reviewRecord.erAuxChecks).toHaveLength(1)
    expect(updatedRecord.erAuxChecks).toHaveLength(1)
    expect(updatedRecord.erAuxChecks[0].equipment).toBe('Fire Jacket')
    expect(updatedRecord.erAuxChecks.some((row) => row.equipment === 'Animal catcher net')).toBe(
      false,
    )
  })

  it('stamps submitted metadata only when converting a review preview into a final submitted record', () => {
    const formWithChecklist = toggleInspectionChecklistItem(
      baseForm,
      'Physical condition checked',
      '2026-06-26T01:00:00.000Z',
    )
    const reviewRecord = buildInspectionReviewRecord({
      form: formWithChecklist,
      mode: 'new',
      reportTypeSlug: 'inspection',
      reportTypeIdPrefix: 'INS',
      sequence: 3,
      user: {
        name: 'Inspector',
        primary_role: 'Tactical Response Team',
        primary_role_code: 'TRT',
      },
    })

    expect(reviewRecord.status).toBe('Draft')
    expect(reviewRecord.submittedAt).toBe('')
    expect(reviewRecord.submittedBy).toBe('')
    expect(reviewRecord.submittedByRole).toBe('Tactical Response Team')
    expect(reviewRecord.submittedByRoleCode).toBe('TRT')
    expect(reviewRecord.checklist).toHaveLength(1)
    expect(reviewRecord.checklistVersion).toBe('inspection-checklist-v1')

    const submittedRecord = buildInspectionSubmittedRecord(
      reviewRecord,
      {
        name: 'Jang',
        primary_role: 'Assistant Incident Commander',
        primary_role_code: 'AIC',
      },
      '2026-04-29T06:00:00.000Z',
    )

    expect(submittedRecord.id).toBe(reviewRecord.id)
    expect(submittedRecord.displayId).toBe(reviewRecord.displayId)
    expect(submittedRecord.status).toBe('Submitted')
    expect(submittedRecord.submittedAt).toBe('2026-04-29T06:00:00.000Z')
    expect(submittedRecord.submittedBy).toBe('Jang')
    expect(submittedRecord.submittedByRole).toBe('Assistant Incident Commander')
    expect(submittedRecord.submittedByRoleCode).toBe('AIC')
    expect(submittedRecord.checklist[0].label).toBe('Physical condition checked')
    expect(submittedRecord.checklistVersion).toBe('inspection-checklist-v1')
  })

  it('removes transient per-type draft maps from submitted inspection records', () => {
    const submittedRecord = buildInspectionSubmittedRecord(
      {
        id: 'preview-1',
        displayId: 'INS-PREVIEW-1',
        incidentType: 'Fire Extinguisher Inspection',
        inspectionType: 'Fire Extinguisher Inspection',
        fireExtinguisherChecks: [{ id: 'fe-1', idLocNo: 'CAN-001' }],
        inspectionTypeDrafts: {
          'general inspection': {
            inspectionType: 'General Inspection',
            inspectionIssues: [{ id: 'issue-1', description: 'Should not submit with FE.' }],
          },
        },
        inspection_type_drafts: {
          'health safety environment inspection': {
            inspectionType: 'Health Safety Environment Inspection',
          },
        },
      },
      { name: 'Jang' },
      '2026-04-29T06:00:00.000Z',
    )

    expect(submittedRecord).toEqual(
      expect.not.objectContaining({
        inspectionTypeDrafts: expect.any(Object),
        inspection_type_drafts: expect.any(Object),
      }),
    )
    expect(submittedRecord.fireExtinguisherChecks).toEqual([
      expect.objectContaining({ id: 'fe-1', idLocNo: 'CAN-001' }),
    ])
    expect(submittedRecord.inspectionIssues || []).toEqual([])
    expect(submittedRecord.status).toBe('Submitted')
  })

  it('formats the session actor role from backend primary role fields', () => {
    const user = {
      roles: ['Tactical Response Team'],
      primary_role: 'Incident Commander',
      primary_role_code: 'IC',
    }

    expect(getInspectionSessionActorRole(user)).toBe('Incident Commander')
    expect(getInspectionSessionActorRoleCode(user)).toBe('IC')
    expect(formatInspectionRole('Incident Commander', 'IC')).toBe('Incident Commander (IC)')
  })

  it('preserves in-progress description whitespace in form state but trims it in payload projection', () => {
    const form = normalizeInspectionForm({
      selectedLocation: 'Zone 1',
      inspectionType: 'SCBA Inspection',
      description: 'typed text ',
      photos: [basePhotos[0]],
    })

    expect(form.description).toBe('typed text ')

    const payload = buildInspectionPayloadSnapshot(form)
    expect(payload.description).toBe('typed text')
  })

  it('returns exact missing fields for inspection validation', () => {
    expect(
      getInspectionFormMissingFields({
        mainLocation: '',
        inspectionType: 'FRT Daily Inspection',
        description: '',
        photos: [],
      }),
    ).toEqual({
      inspectionType: false,
      inspectedAt: true,
      selectedLocation: true,
      description: false,
      photos: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: true,
      frtCompartment: true,
      frtDailyChecks: true,
      frtDailyRemarks: false,
      frtOneOffChecks: true,
      frtOneOffRemarks: false,
      hydraulicChecks: false,
      hydraulicRemarks: false,
      highAngleSession: false,
      highAngleChecks: false,
      highAngleRemarks: false,
      scbaSession: false,
      scbaChecks: false,
      scbaRemarks: false,
    })
  })

  it('normalizes and validates HSE area-satisfactory and finding outcomes', () => {
    expect(toggleHseSelection(['unsafeAct', 'environmental'], 'Area Satisfactory')).toEqual([
      'areaSatisfactory',
    ])
    expect(toggleHseSelection(['areaSatisfactory'], 'Unsafe Condition')).toEqual([
      'unsafeCondition',
    ])

    const incompleteArea = getInspectionFormMissingFields({
      mainLocation: 'Zone 1',
      inspectionType: 'Health Safety Environment Inspection',
      hseInspectedBy: 'Inspector A',
      hseInspectionDate: '2026-06-29',
      hseSelections: ['areaSatisfactory'],
    })
    expect(incompleteArea).toEqual(
      expect.objectContaining({
        inspectionType: false,
        selectedLocation: false,
        description: false,
        photos: false,
        hseSession: false,
        hseSelection: false,
        hseDetails: true,
      }),
    )

    const findingPayload = buildInspectionPayloadSnapshot({
      mainLocation: 'Zone 1',
      inspectionType: 'Health Safety Environment Inspection',
      hseInspectedBy: 'Inspector A',
      hseInspectionDate: '2026-06-29',
      hseSelections: ['unsafeAct', 'unsafeCondition'],
      hseUnsafeActDetails: 'Worker bypassed barricade.',
      hseUnsafeConditionDetails: 'Open trench without cover.',
      hseSeverity: 'High',
      photos: [basePhotos[0]],
    })

    expect(findingPayload.hseSelections).toEqual(['unsafeAct', 'unsafeCondition'])
    expect(findingPayload.checklist.map((item) => item.label)).toEqual([
      'Unsafe Act - High',
      'Unsafe Condition - High',
    ])
    expect(findingPayload.description).toContain(
      'Selected outcome(s): Unsafe Act, Unsafe Condition.',
    )
    expect(findingPayload.description).toContain('- Unsafe Act: Worker bypassed barricade.')
    expect(findingPayload.description).toContain('- Unsafe Condition: Open trench without cover.')
    expect(getInspectionFormMissingFields(findingPayload)).toEqual(
      expect.objectContaining({
        hseSession: false,
        hseSelection: false,
        hseDetails: false,
      }),
    )
  })

  it('returns exact HSE validation targets while preserving missing-field booleans', () => {
    const areaState = getInspectionFormValidationState({
      mainLocation: 'Zone 1',
      inspectionType: 'Health Safety Environment Inspection',
      hseInspectedBy: 'Inspector A',
      hseInspectionDate: '2026-06-29',
      hseSelections: ['areaSatisfactory'],
    })

    expect(areaState.missing).toEqual(
      expect.objectContaining({
        hseSession: false,
        hseSelection: false,
        hseDetails: true,
      }),
    )
    expect(areaState.firstTarget).toEqual({
      field: 'hseDetails',
      detailKey: 'hseAreaConditionRemarks',
    })
    expect(areaState.hse.missingFields).toEqual({ hseAreaConditionRemarks: true })

    const findingState = getInspectionFormValidationState({
      mainLocation: 'Zone 1',
      inspectionType: 'Health Safety Environment Inspection',
      hseInspectedBy: 'Inspector A',
      hseInspectionDate: '2026-06-29',
      hseSelections: ['unsafeAct', 'environmental'],
      hseUnsafeActDetails: '',
      hseEnvironmentalDetails: '',
    })

    expect(findingState.missing).toEqual(
      expect.objectContaining({
        hseSession: false,
        hseSelection: false,
        hseDetails: true,
      }),
    )
    expect(findingState.hse.missingFields).toEqual({
      hseSeverity: true,
      hseUnsafeActDetails: true,
      hseEnvironmentalDetails: true,
      hsePhotoEvidence: true,
    })
    expect(findingState.firstTarget).toEqual({
      field: 'hseDetails',
      detailKey: 'hseSeverity',
    })
  })

  it('builds an owned General Inspection payload summary from description only', () => {
    const payload = buildInspectionPayloadSnapshot({
      mainLocation: 'Zone 1',
      selectedLocation: 'Zone 1',
      inspectionType: 'General Inspection',
      description: '',
      photos: [basePhotos[0]],
      checklist: [
        { id: 'housekeeping', label: 'Housekeeping checked', selected: true },
        { id: 'access', label: 'Access clear', selected: true },
      ],
    })

    expect(payload.description).toContain('General inspection completed at Zone 1.')
    expect(payload.description).not.toContain('- Housekeeping checked')
    expect(payload.description).not.toContain('- Access clear')
    expect(payload.checklist).toEqual([])
  })

  it('normalizes hydraulic checks and builds a structured hydraulic payload summary', () => {
    const form = normalizeInspectionForm({
      mainLocation: 'FRT',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      photos: [basePhotos[0]],
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          equipmentDescription: 'FRT primary rescue pump.',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'N/A',
          noLeakageRemarks: 'Leak test skipped because tool was isolated.',
          functionTest: 'Defect',
          functionTestRemarks: 'Slow response during function test.',
          functionTestPhotos: [
            {
              id: 'function-photo-1',
              fileName: 'function.jpg',
              description: 'Function test defect',
              url: 'data:image/png;base64,abc123',
            },
          ],
          remarks: 'Priority follow-up required.',
          photos: [
            {
              id: 'hyd-photo-1',
              fileName: 'pump.jpg',
              description: 'Pump defect',
              url: 'data:image/png;base64,abc123',
            },
          ],
        },
      ],
    })

    expect(form.hydraulicChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Hydraulic Pump Motor 1',
        equipmentDescription: 'FRT primary rescue pump.',
        functionTest: 'Defect',
      }),
    )

    const payload = buildInspectionPayloadSnapshot({
      ...form,
      hydraulicChecks: [
        ...form.hydraulicChecks,
        ...[
          'Hydraulic Hose 1',
          'Hydraulic Spreader 1',
          'Hydraulic Cutter 1',
          'Hydraulic Combi 1',
          'Hydraulic Cylinder Ramp 1',
        ].map((equipment) => ({
          id: `frt:${equipment
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')}`,
          location: 'FRT',
          equipment,
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
          remarks: '',
        })),
      ],
    })

    expect(payload.hydraulicChecks).toHaveLength(6)
    expect(payload.hydraulicChecks[0].functionTestRemarks).toBe(
      'Slow response during function test.',
    )
    expect(payload.hydraulicChecks[0].noLeakage).toBe('N/A')
    expect(payload.hydraulicChecks[0].noLeakageRemarks).toBe(
      'Leak test skipped because tool was isolated.',
    )
    expect(payload.hydraulicChecks[0].equipmentDescription).toBe('FRT primary rescue pump.')
    expect(payload.hydraulicChecks[0].functionTestPhotos).toEqual([
      expect.objectContaining({
        id: 'function-photo-1',
        fileName: 'function.jpg',
        description: 'Function test defect',
      }),
    ])
    expect(payload.hydraulicChecks[0].photos).toEqual([
      expect.objectContaining({
        id: 'hyd-photo-1',
        fileName: 'pump.jpg',
        description: 'Pump defect',
      }),
    ])
    expect(payload.description).toContain('Slow response during function test.')
    expect(payload.description).toContain(
      'No Leakage N/A: Leak test skipped because tool was isolated.',
    )
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Hydraulic Pump Motor 1 - Function Test: Defect',
        }),
      ]),
    )
    expect(payload.findings[0]).toEqual(
      expect.objectContaining({
        confirmedLocation: 'FRT',
        selectedDescription: expect.stringContaining('Defect/remark item(s): 1.'),
      }),
    )
  })

  it('keeps retained hydraulic evidence out of active defect descriptions and checklist labels', () => {
    const form = {
      mainLocation: 'FRT',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      photos: [],
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          physicalConditionRemarks: 'Old crack evidence retained.',
          physicalConditionPhotos: [
            {
              id: 'retained-photo-1',
              fileName: 'old-crack.jpg',
              description: 'Old crack evidence',
              url: 'data:image/png;base64,abc123',
            },
          ],
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
        },
      ],
    }

    const summary = getHydraulicCheckSummary(form)
    expect(summary.defectCount).toBe(0)
    expect(summary.retainedEvidenceCount).toBe(1)
    expect(getHydraulicRetainedEvidenceFields(form.hydraulicChecks[0])).toEqual([
      expect.objectContaining({ key: 'physicalCondition' }),
    ])

    const payload = buildInspectionPayloadSnapshot(form)
    expect(payload.description).toContain('no defects recorded')
    expect(payload.description).not.toContain('Old crack evidence retained.')
    expect(payload.hydraulicChecks[0].physicalConditionRemarks).toBe('Old crack evidence retained.')
    expect(payload.hydraulicChecks[0].physicalConditionPhotos).toEqual([
      expect.objectContaining({ id: 'retained-photo-1' }),
    ])
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Hydraulic Pump Motor 1 - Physical Condition: OK',
        }),
      ]),
    )
    expect(payload.checklist).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: expect.stringContaining('Defect'),
        }),
      ]),
    )
  })

  it('uses catalog equipment rows for hydraulic visibility and preserves custom metadata', () => {
    const summary = getHydraulicCheckSummary({
      mainLocation: 'FRT',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      hydraulicEquipmentRows: [
        {
          id: 'catalog-1',
          equipmentId: 1,
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          equipmentKey: 'hydraulic-pump-motor-1',
          equipmentSource: 'seed',
          equipmentDescription: 'FRT primary rescue pump.',
          isCustomEquipment: false,
          canEdit: true,
          canDelete: true,
        },
        {
          id: 'catalog-99',
          equipmentId: 99,
          location: 'FRT',
          equipment: 'Hydraulic Ram Extension',
          equipmentKey: 'hydraulic-ram-extension',
          equipmentSource: 'custom',
          equipmentDescription: 'Stored with FRT tools.',
          isCustomEquipment: true,
        },
      ],
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
          equipmentSource: 'seed',
          isCustomEquipment: false,
        },
        {
          id: 'catalog-99',
          equipmentId: 99,
          location: 'FRT',
          equipment: 'Hydraulic Ram Extension',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
          equipmentSource: 'custom',
          isCustomEquipment: true,
        },
      ],
    })

    expect(summary.totalCount).toBe(7)
    expect(summary.checkedCount).toBe(2)
    expect(summary.visibleChecks).toHaveLength(7)
    expect(summary.visibleChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'frt:hydraulic-pump-motor-1',
          equipment: 'Hydraulic Pump Motor 1',
          equipmentId: 1,
          equipmentSource: 'seed',
          equipmentDescription: 'FRT primary rescue pump.',
          canEdit: true,
          canDelete: true,
        }),
        expect.objectContaining({
          equipment: 'Hydraulic Ram Extension',
          equipmentId: 99,
          equipmentSource: 'custom',
          equipmentDescription: 'Stored with FRT tools.',
          isCustomEquipment: true,
        }),
      ]),
    )
  })

  it('normalizes Fire Extinguisher rows without relying on duplicate IDs or barcodes', () => {
    const rows = normalizeFireExtinguisherChecks([
      {
        id: 'fe:101',
        catalogId: 101,
        sourceRowNumber: '13',
        mainLocation: 'Manjung Hub',
        subLocation: 'Infront Nursing Room',
        idLocNo: 'ADO-007',
        barcodeNo: 'SR072015Y133879',
        feType: 'CO\u00b2 5KG',
        physicalCondition: 'good',
        signageCondition: 'GOOD',
        boxKeyAvailability: 'N/A',
        boxGlassAvailability: 'n/a',
        operationalCondition: 'Good',
      },
      {
        id: 'fe:102',
        catalogId: 102,
        sourceRowNumber: '14',
        mainLocation: 'Manjung Hub',
        subLocation: 'Infront Nursing Room',
        idLocNo: 'ADO-007',
        barcodeNo: 'SR072015Y133879',
        feType: 'CO\ufffd 5KG',
        physicalCondition: 'Not Good',
        physicalConditionRemarks: 'Damaged bracket.',
        signageCondition: 'Good',
        boxKeyAvailability: 'Yes',
        boxGlassAvailability: 'No',
        boxGlassAvailabilityRemarks: 'Glass missing.',
        operationalCondition: 'Not Good',
        operationalConditionRemarks: 'Pressure failed.',
      },
      {
        id: '',
        catalogId: '',
        sourceRowNumber: '517',
        mainLocation: 'Techical Service Cabin',
        subLocation: 'CABIN 1(L)',
        idLocNo: '',
        barcodeNo: 'SR012021Y017142',
        feType: 'DP 6KG',
      },
    ])

    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: 'fe:101',
        catalogId: 101,
        sourceRowNumber: '13',
        idLocNo: 'ADO-007',
        barcodeNo: 'SR072015Y133879',
        feType: 'CO2 5KG',
        physicalCondition: 'Good',
        signageCondition: 'Good',
        boxGlassAvailability: 'N/A',
      }),
    )
    expect(rows[1]).toEqual(
      expect.objectContaining({
        id: 'fe:102',
        catalogId: 102,
        feType: 'CO2 5KG',
        physicalCondition: 'Not Good',
      }),
    )
    expect(rows[2]).toEqual(
      expect.objectContaining({
        id: 'fe:517',
        sourceRowNumber: '517',
        idLocNo: '',
        barcodeNo: 'SR012021Y017142',
      }),
    )
  })

  it('filters and validates Fire Extinguisher visible rows for selected main and sub-location', () => {
    const form = {
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionType: 'Fire Extinguisher Inspection',
      fireExtinguisherInspectedBy: 'Inspector Fire',
      fireExtinguisherInspectionDate: '2026-06-29',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:1',
          catalogId: 1,
          sourceRowNumber: '7',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          feType: 'DP 6KG',
        },
        {
          id: 'fe:2',
          catalogId: 2,
          sourceRowNumber: '8',
          mainLocation: 'Manjung Hub',
          subLocation: 'Infront Auditorium',
          idLocNo: 'ADO-002',
          barcodeNo: 'EE042021Y544839',
          feType: 'DP 6KG',
        },
      ],
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 1,
          physicalCondition: 'Good',
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'No',
          boxGlassAvailabilityRemarks: 'Glass missing.',
          boxGlassAvailabilityPhotos: [
            {
              id: 'fe-photo-1',
              fileName: 'glass.jpg',
              description: 'Missing box glass.',
              url: 'data:image/png;base64,glass123',
            },
          ],
          operationalCondition: 'Good',
        },
      ],
    }

    const summary = getFireExtinguisherCheckSummary(form)
    expect(summary.totalCount).toBe(1)
    expect(summary.completedCount).toBe(1)
    expect(summary.defectCount).toBe(1)
    expect(summary.defectFieldCount).toBe(1)
    expect(summary.incompleteDefectRemarkCount).toBe(0)
    expect(summary.incompleteDefectPhotoCount).toBe(0)
    expect(summary.visibleChecks[0]).toEqual(
      expect.objectContaining({
        idLocNo: 'ADO-001',
        subLocation: 'Reception',
        boxGlassAvailability: 'No',
      }),
    )
    expect(filterFireExtinguisherRows(summary.visibleChecks, '544896')).toHaveLength(1)
    expect(filterFireExtinguisherRows(summary.visibleChecks, 'auditorium')).toHaveLength(0)
  })

  it('does not expose Fire Extinguisher rows before a sub-location is selected', () => {
    const summary = getFireExtinguisherCheckSummary({
      mainLocation: 'Manjung Hub',
      inspectionType: 'Fire Extinguisher Inspection',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:1',
          catalogId: 1,
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          feType: 'DP 6KG',
        },
      ],
    })

    expect(summary.visibleChecks).toEqual([])
    expect(summary.totalCount).toBe(0)
  })

  it('returns exact Fire Extinguisher validation row targets for statuses, defect remarks, and defect photos', () => {
    const baseFireForm = {
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionType: 'Fire Extinguisher Inspection',
      fireExtinguisherInspectedBy: 'Inspector Fire',
      fireExtinguisherInspectionDate: '2026-06-29',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:1',
          catalogId: 1,
          sourceRowNumber: '7',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          feType: 'DP 6KG',
        },
      ],
    }

    const missingStatusState = getInspectionFormValidationState({
      ...baseFireForm,
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 1,
          physicalCondition: 'Good',
        },
      ],
    })

    expect(missingStatusState.missing).toEqual(
      expect.objectContaining({
        fireExtinguisherSession: false,
        fireExtinguisherChecks: true,
        fireExtinguisherRemarks: false,
      }),
    )
    expect(missingStatusState.fireExtinguisher.missingStatusesByRow['fe:1']).toContain(
      'signageCondition',
    )
    expect(missingStatusState.firstTarget).toEqual(
      expect.objectContaining({
        field: 'fireExtinguisherChecks',
        rowId: 'fe:1',
        checkKey: 'signageCondition',
      }),
    )

    const missingRemarkState = getInspectionFormValidationState({
      ...baseFireForm,
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 1,
          physicalCondition: 'Not Good',
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'Yes',
          operationalCondition: 'Good',
        },
      ],
    })

    expect(missingRemarkState.missing).toEqual(
      expect.objectContaining({
        fireExtinguisherChecks: false,
        fireExtinguisherRemarks: true,
      }),
    )
    expect(missingRemarkState.fireExtinguisher.missingRemarksByRow['fe:1']).toEqual([
      'physicalConditionRemarks',
    ])
    expect(missingRemarkState.fireExtinguisher.missingPhotosByRow['fe:1']).toEqual([
      'physicalConditionPhotos',
    ])
    expect(missingRemarkState.firstTarget).toEqual({
      field: 'fireExtinguisherRemarks',
      rowId: 'fe:1',
      checkKey: '',
      detailKey: 'physicalConditionRemarks',
    })

    const missingPhotoState = getInspectionFormValidationState({
      ...baseFireForm,
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 1,
          physicalCondition: 'Not Good',
          physicalConditionRemarks: 'Cylinder body dented.',
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'Yes',
          operationalCondition: 'Good',
        },
      ],
    })

    expect(missingPhotoState.missing).toEqual(
      expect.objectContaining({
        fireExtinguisherChecks: false,
        fireExtinguisherRemarks: true,
      }),
    )
    expect(missingPhotoState.fireExtinguisher.missingRemarksByRow['fe:1']).toBeUndefined()
    expect(missingPhotoState.fireExtinguisher.missingPhotosByRow['fe:1']).toEqual([
      'physicalConditionPhotos',
    ])
    expect(missingPhotoState.firstTarget).toEqual({
      field: 'fireExtinguisherRemarks',
      rowId: 'fe:1',
      checkKey: '',
      detailKey: 'physicalConditionPhotos',
    })
  })

  it('does not block Fire Extinguisher review for session-completed rows without local payload', () => {
    const validationState = getInspectionFormValidationState({
      mainLocation: 'Canteen',
      subLocation: 'Canteen',
      inspectionType: 'Fire Extinguisher Inspection',
      fireExtinguisherInspectedBy: 'Inspector Fire',
      fireExtinguisherInspectionDate: '2026-06-29',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:session-completed',
          catalogId: 101,
          mainLocation: 'Canteen',
          subLocation: 'Canteen',
          idLocNo: 'CAN-001',
          barcodeNo: 'SR072024Y171594',
          feType: 'DP 9KG',
          sessionResult: {
            status: 'completed',
            checkedBy: 'Inspector A',
            checkedAt: '2026-06-29T09:30:00Z',
          },
        },
      ],
      fireExtinguisherChecks: [],
    })

    expect(validationState.missing).toEqual(
      expect.objectContaining({
        fireExtinguisherChecks: false,
        fireExtinguisherRemarks: false,
      }),
    )
    expect(validationState.fireExtinguisher.errorCount).toBe(0)
    expect(validationState.fireExtinguisher.missingStatusesByRow).toEqual({})
  })

  it('omits pending Fire Extinguisher checklist items from derived payloads', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'Fire Extinguisher Inspection',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Manjung Hub > Reception',
        fireExtinguisherInspectedBy: 'Inspector Fire',
        fireExtinguisherInspectionDate: '2026-06-29',
        fireExtinguisherChecks: [
          {
            id: 'fe:1',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            idLocNo: 'ADO-001',
            physicalCondition: 'Good',
          },
        ],
      }),
    )

    expect(payload.checklist).toEqual([
      expect.objectContaining({
        label: 'ADO-001 - FE Physical Condition: Good',
      }),
    ])
    expect(payload.checklist.some((item) => item.label.includes('Pending'))).toBe(false)
  })

  it('requires complete hydraulic checks and defect evidence for hydraulic review', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'FRT',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      inspectedAt: '2026-06-29T09:30',
      photos: [],
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'Defect',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
          remarks: '',
        },
      ],
    })

    expect(incomplete).toEqual({
      inspectionType: false,
      inspectedAt: false,
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: false,
      frtDailyChecks: false,
      frtDailyRemarks: false,
      frtOneOffChecks: false,
      frtOneOffRemarks: false,
      hydraulicChecks: true,
      hydraulicRemarks: true,
      highAngleSession: false,
      highAngleChecks: false,
      highAngleRemarks: false,
      scbaSession: false,
      scbaChecks: false,
      scbaRemarks: false,
    })
  })

  it('normalizes ER Aux checks and builds a structured ER Aux payload summary', () => {
    const form = normalizeInspectionForm({
      mainLocation: 'Store',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxInspectedBy: 'Inspector One',
      erAuxInspectionDate: '2026-06-28',
      erAuxChecks: [
        {
          id: 'store:fire-jacket',
          location: 'Store',
          equipment: 'Fire Jacket',
          quantity: '15',
          condition: 'OK',
          remarks: '',
        },
        {
          id: 'store:chainsaw',
          location: 'Store',
          equipment: 'Chainsaw',
          quantity: '0',
          condition: 'Missing',
          remarks: 'Sent for replacement.',
        },
      ],
    })

    const payload = buildInspectionPayloadSnapshot(form)

    expect(payload.erAuxInspectedBy).toBe('Inspector One')
    expect(payload.erAuxInspectionDate).toBe('2026-06-28')
    expect(payload.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Fire Jacket',
          quantity: '15',
          condition: 'OK',
        }),
        expect.objectContaining({
          equipment: 'Chainsaw',
          condition: 'Missing',
          remarks: 'Sent for replacement.',
        }),
      ]),
    )
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Fire Jacket - Qty 15: OK',
        }),
        expect.objectContaining({
          label: 'Chainsaw - Qty 0: Missing',
        }),
      ]),
    )
    expect(payload.description).toContain(
      'Emergency Response Auxiliary Equipment checked at Store by Inspector One',
    )
    expect(payload.description).toContain('Chainsaw (qty 0) - Missing: Sent for replacement.')
  })

  it('keeps loaded static ER Aux equipment rows manageable for card kebab actions', () => {
    const summary = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          equipmentSource: 'seed',
          defaultQuantity: '7',
        },
      ],
      erAuxChecks: [],
    })

    expect(summary.visibleChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Radio Tetra',
        isLocalSeedEquipment: true,
        canEdit: true,
        canDelete: true,
      }),
    )
  })

  it('seeds ER Aux equipment from the VMM checklist by location', () => {
    const store = getErAuxCheckSummary({
      mainLocation: 'Store',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxChecks: [],
    })
    const office = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxChecks: [],
    })

    expect(store.visibleChecks).toHaveLength(26)
    expect(store.visibleChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ equipment: 'Fire Jacket', quantity: '15' }),
        expect.objectContaining({ equipment: 'Fire helmet', quantity: '2' }),
        expect.objectContaining({ equipment: 'Animal catcher net', quantity: '3' }),
      ]),
    )
    expect(office.visibleChecks).toHaveLength(5)
    expect(office.visibleChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ equipment: 'Radio Tetra', quantity: '7' }),
        expect.objectContaining({ equipment: 'Radio VHF', quantity: '5' }),
        expect.objectContaining({ equipment: 'Hydrant static pressure tester', quantity: '1' }),
      ]),
    )
  })

  it('keeps ER Aux checklist seeds visible when catalog rows are cached', () => {
    const summary = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'office:smoke-torch',
          location: 'Office',
          equipment: 'Smoke Torch',
          equipmentSource: 'custom',
          defaultQuantity: '1',
          canEdit: true,
          canDelete: true,
        },
      ],
      erAuxChecks: [],
    })

    expect(summary.visibleChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ equipment: 'Radio Tetra', quantity: '7' }),
        expect.objectContaining({ equipment: 'Hydrant flow test kit', quantity: '1' }),
        expect.objectContaining({ equipment: 'Smoke Torch', quantity: '1' }),
      ]),
    )
  })

  it('replaces ER Aux seeded rows by id when a seed item is renamed', () => {
    const summary = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'office:mobile-radio',
          location: 'Office',
          equipment: 'Smoke Mobile Radio',
          equipmentSource: 'local',
          defaultQuantity: '1',
          canEdit: true,
          canDelete: true,
        },
      ],
      erAuxChecks: [],
    })
    const ids = summary.visibleChecks.map((row) => row.id)

    expect(ids.filter((id) => id === 'office:mobile-radio')).toHaveLength(1)
    expect(summary.visibleChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:mobile-radio',
          equipment: 'Smoke Mobile Radio',
          quantity: '1',
        }),
      ]),
    )
    expect(summary.visibleChecks.some((row) => row.equipment === 'Mobile Radio')).toBe(false)
  })

  it('defaults ER Aux quantities but preserves explicit user edits', () => {
    const untouched = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxChecks: [],
    })

    expect(untouched.visibleChecks[0]).toEqual(
      expect.objectContaining({
        id: 'office:radio-tetra',
        quantity: '7',
      }),
    )

    const cleared = getErAuxCheckSummary({
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxChecks: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          quantity: '',
          condition: 'OK',
        },
      ],
    })

    expect(cleared.visibleChecks[0]).toEqual(
      expect.objectContaining({
        id: 'office:radio-tetra',
        quantity: '',
      }),
    )

    const edited = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        mainLocation: 'Office',
        inspectionType: 'ER Aux Equipment Inspection',
        erAuxChecks: [
          {
            id: 'office:radio-tetra',
            location: 'Office',
            equipment: 'Radio Tetra',
            quantity: '8',
            condition: 'OK',
          },
        ],
      }),
    )

    expect(edited.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          quantity: '8',
        }),
      ]),
    )
    expect(edited.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Radio Tetra - Qty 8: OK',
        }),
      ]),
    )
  })

  it('reports exact incomplete ER Aux rows and fields for review validation', () => {
    const state = getInspectionFormValidationState({
      mainLocation: 'Office',
      inspectedAt: '2026-07-03T07:10',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          defaultQuantity: '7',
        },
      ],
      erAuxChecks: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          quantity: '',
          condition: 'Missing',
        },
      ],
    })

    expect(state.missing.erAuxChecks).toBe(true)
    expect(state.erAux.incompleteCheckDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          equipment: 'Radio Tetra',
          missing: ['quantity'],
          detailKey: 'quantity',
        }),
      ]),
    )
    expect(state.firstTarget).toEqual({
      field: 'erAuxChecks',
      rowId: 'office:radio-tetra',
      detailKey: 'quantity',
    })
  })

  it('allows ER Aux review for completed saved rows without requiring untouched catalog rows', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'Store',
      inspectedAt: '2026-07-03T07:10',
      inspectionType: 'ER Aux Equipment Inspection',
      erAuxEquipmentRows: [
        {
          id: 'store:fire-jacket',
          location: 'Store',
          equipment: 'Fire Jacket',
          defaultQuantity: '15',
        },
        {
          id: 'store:animal-catcher-net',
          location: 'Store',
          equipment: 'Animal catcher net',
          defaultQuantity: '3',
        },
      ],
      erAuxChecks: [
        {
          id: 'store:fire-jacket',
          location: 'Store',
          equipment: 'Fire Jacket',
          quantity: '15',
          condition: 'OK',
        },
      ],
      photos: [],
    })

    expect(incomplete.erAuxChecks).toBe(false)
    expect(incomplete.erAuxRemarks).toBe(false)
  })

  it('requires ER Aux quantities and conditions for review when defect remarks/photos are optional until defect', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'Store',
      inspectionType: 'ER Aux Equipment Inspection',
      inspectedAt: '2026-06-29T09:30',
      erAuxInspectedBy: '',
      erAuxInspectionDate: '',
      erAuxChecks: [
        {
          id: 'store:chainsaw',
          location: 'Store',
          equipment: 'Chainsaw',
          quantity: '',
          condition: 'Missing',
          remarks: '',
        },
      ],
      photos: [],
    })

    expect(incomplete).toEqual({
      inspectionType: false,
      inspectedAt: false,
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: true,
      erAuxRemarks: false,
      frtSession: false,
      frtDailyChecks: false,
      frtDailyRemarks: false,
      frtOneOffChecks: false,
      frtOneOffRemarks: false,
      hydraulicChecks: false,
      hydraulicRemarks: false,
      highAngleSession: false,
      highAngleChecks: false,
      highAngleRemarks: false,
      scbaSession: false,
      scbaChecks: false,
      scbaRemarks: false,
    })
  })

  it('normalizes SCBA checks and builds a structured SCBA payload summary', () => {
    const form = normalizeInspectionForm({
      mainLocation: 'FRT',
      inspectionType: 'SCBA Inspection',
      scbaInspectedBy: 'Inspector SCBA',
      scbaInspectionDate: '2026-06-28',
      scbaBackPlateChecks: [
        {
          id: 'backPlate:frt:msa:06',
          location: 'FRT',
          brand: 'MSA',
          serialNo: '06',
          backPlateHarnessCondition: 'Good',
          highPressureHose: 'Not Good',
          pressureGauge: 'Good',
          alarmDevice: 'Good',
          demandValve: 'Good',
          sealing: 'Good',
          cleanliness: 'Good',
          remarks: 'Hose coupling worn.',
        },
      ],
      scbaCylinderChecks: [
        {
          id: 'cylinder:frt:msa:6-8l-08',
          location: 'FRT',
          brand: 'MSA',
          serialNo: '6.8L/08',
          size: '6.8',
          cylinderType: 'Composite',
          servicePressure: '300',
          containedPressure: '280',
          physicalCondition: 'Good',
          handwheelCondition: 'Good',
          valveBodyCondition: 'Good',
          screwPlugCondition: 'Good',
          cleanliness: 'Good',
          remarks: '',
        },
      ],
      scbaFaceMaskChecks: [
        {
          id: 'faceMask:frt:drager:02',
          location: 'FRT',
          brand: 'Drager',
          serialNo: '02',
          visorCondition: 'Good',
          ldvPort: 'Good',
          ldvReleaseButton: 'Good',
          leakTest: 'Not Good',
          speechDiaphragm: 'Good',
          harness: 'Good',
          neckStrap: 'Good',
          remarks: 'Leak test failed on seal.',
        },
      ],
    })

    const summary = getScbaCheckSummary(form)
    const payload = buildInspectionPayloadSnapshot(form)

    expect(summary.totalCount).toBe(23)
    expect(summary.checkedCount).toBe(3)
    expect(summary.issueCount).toBe(2)
    expect(summary.visibleSections.map((section) => section.title)).toEqual([
      'Back Plate',
      'Cylinder',
      'Face Mask',
    ])
    expect(payload.scbaInspectedBy).toBe('Inspector SCBA')
    expect(payload.scbaInspectionDate).toBe('2026-06-28')
    expect(payload.scbaBackPlateChecks[0].highPressureHose).toBe('Not Good')
    expect(payload.scbaCylinderChecks[0]).toEqual(
      expect.objectContaining({
        serialNo: '6.8L/08',
        cylinderType: 'Composite',
        servicePressure: '300',
        containedPressure: '280',
      }),
    )
    expect(payload.scbaFaceMaskChecks[0].leakTest).toBe('Not Good')
    expect(payload.description).toContain('SCBA checked at FRT by Inspector SCBA on 2026-06-28.')
    expect(payload.description).toContain(
      'Back Plate MSA 06: High Pressure Hose - High Pressure Hose: Hose coupling worn.',
    )
    expect(payload.description).toContain(
      'Face Mask Drager 02: Leak Test - Leak Test: Leak test failed on seal.',
    )
    expect(payload.checklist.length).toBeGreaterThanOrEqual(2)
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Back Plate MSA 06 - High Pressure Hose: Not Good' }),
        expect.objectContaining({ label: 'Face Mask Drager 02 - Leak Test: Not Good' }),
      ]),
    )
  })

  it('normalizes SCBA custom sections with field evidence and summary validation', () => {
    const form = normalizeInspectionForm({
      mainLocation: 'CUSTOM BAY',
      inspectionType: 'SCBA Inspection',
      scbaInspectedBy: 'Inspector SCBA',
      scbaInspectionDate: '2026-07-03',
      scbaBackPlateChecks: [],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      scbaCustomSections: [
        {
          title: 'Regulator',
          shortLabel: 'Regulator',
          fields: [{ key: 'purgeValve', label: 'Purge Valve', kind: 'status' }],
          rows: [
            {
              id: 'customScba-regulator:frt:msa:r-01',
              location: 'CUSTOM BAY',
              brand: 'MSA',
              serialNo: 'R-01',
              purgeValve: 'Not Good',
              purgeValveRemarks: 'Purge valve sticks.',
              purgeValvePhotos: [
                {
                  id: 'purge-photo',
                  fileName: 'purge.png',
                  description: 'Purge valve close-up.',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              photos: [
                {
                  id: 'regulator-general',
                  fileName: 'regulator.png',
                  description: 'General regulator photo.',
                  url: 'data:image/png;base64,def456',
                },
              ],
            },
          ],
        },
      ],
    })

    const summary = getScbaCheckSummary(form)
    const payload = buildInspectionPayloadSnapshot(form)
    const missing = getInspectionFormMissingFields(form)
    const signature = JSON.parse(createInspectionFormSignature(form))

    expect(summary.visibleSections.map((section) => section.title)).toEqual(['Regulator'])
    expect(summary.totalCount).toBe(1)
    expect(summary.issueCount).toBe(1)
    expect(missing.scbaChecks).toBe(false)
    expect(missing.scbaRemarks).toBe(false)
    expect(payload.scbaCustomSections[0].rows[0]).toMatchObject({
      brand: 'MSA',
      serialNo: 'R-01',
      purgeValve: 'Not Good',
      purgeValveRemarks: 'Purge valve sticks.',
    })
    expect(payload.description).toContain('Regulator MSA R-01: Purge Valve')
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Regulator MSA R-01 - Purge Valve: Not Good' }),
      ]),
    )
    expect(signature.scbaCustomSections[0].rows[0].purgeValvePhotos[0]).toMatchObject({
      id: 'purge-photo',
      description: 'Purge valve close-up.',
    })
    expect(signature.scbaCustomSections[0].rows[0].photos[0]).toMatchObject({
      id: 'regulator-general',
      description: 'General regulator photo.',
    })
  })

  it('keeps the workbook-backed SCBA section roster, metadata, and source labels stable', () => {
    expect(SCBA_SECTION_DEFINITIONS.map((section) => section.title)).toEqual([
      'Back Plate',
      'Cylinder',
      'Face Mask',
    ])

    expect(SCBA_SECTION_DEFINITIONS[0]).toMatchObject({
      sourceTitle: 'Back Plate',
      sourceWorkbook: 'report-reference/VMM SCBA Inspection Checklist.xlsx',
      supportedMainLocations: ['FRT', 'FRT (Spare)', 'Store'],
    })
    expect(SCBA_SECTION_DEFINITIONS[0].fields[0]).toMatchObject({
      key: 'backPlateHarnessCondition',
      label: 'Back Plate & Harness',
      sourceLabel: 'Back Plate and Harness Condition',
      kind: 'status',
    })
    expect(SCBA_SECTION_DEFINITIONS[0].rows).toHaveLength(27)
    expect(SCBA_SECTION_DEFINITIONS[0].rows[0]).toMatchObject({
      location: 'Store',
      brand: 'MSA',
      serialNo: '01',
    })
    expect(SCBA_SECTION_DEFINITIONS[0].rows[1]).toMatchObject({
      location: 'FRT (Spare)',
      brand: 'MSA',
      serialNo: '02',
    })
    expect(SCBA_SECTION_DEFINITIONS[0].rows[5]).toMatchObject({
      location: 'FRT',
      brand: 'MSA',
      serialNo: '06',
    })
    expect(SCBA_SECTION_DEFINITIONS[0].rows[26]).toMatchObject({
      location: 'Store',
      brand: 'Drager',
      serialNo: '12',
    })

    expect(SCBA_SECTION_DEFINITIONS[1].fields[0]).toMatchObject({
      key: 'servicePressure',
      sourceLabel: 'Service Pressure (Bar)',
      kind: 'text',
    })
    expect(SCBA_SECTION_DEFINITIONS[1].rows).toHaveLength(35)
    expect(SCBA_SECTION_DEFINITIONS[1].rows[7]).toMatchObject({
      location: 'FRT',
      brand: 'MSA',
      serialNo: '6.8L/08',
      size: '6.8',
      cylinderType: 'Composite',
    })
    expect(SCBA_SECTION_DEFINITIONS[1].rows[15]).toMatchObject({
      location: 'Store',
      brand: 'Drager',
      serialNo: '6L/01',
      size: '6',
      cylinderType: 'Steel',
    })
    expect(SCBA_SECTION_DEFINITIONS[1].rows[29]).toMatchObject({
      location: 'FRT',
      brand: 'Drager',
      serialNo: '9L/03',
      size: '9',
      cylinderType: 'Composite',
    })

    expect(SCBA_SECTION_DEFINITIONS[2].fields[5]).toMatchObject({
      key: 'harness',
      sourceLabel: 'Harness',
      kind: 'status',
    })
    expect(SCBA_SECTION_DEFINITIONS[2].rows).toHaveLength(27)
    expect(SCBA_SECTION_DEFINITIONS[2].rows[6]).toMatchObject({
      location: 'FRT',
      brand: 'MSA',
      serialNo: '07',
    })
    expect(SCBA_SECTION_DEFINITIONS[2].rows[16]).toMatchObject({
      location: 'FRT',
      brand: 'Drager',
      serialNo: '02',
    })
    expect(SCBA_SECTION_DEFINITIONS[2].rows[26]).toMatchObject({
      location: 'FRT',
      brand: 'Drager',
      serialNo: '12',
    })
  })

  it('filters visible SCBA rows by the selected workbook location roster', () => {
    const frt = getScbaCheckSummary({ mainLocation: 'FRT' })
    expect(frt.totalCount).toBe(23)
    expect(frt.visibleSections.map((section) => [section.key, section.visibleRows.length])).toEqual(
      [
        ['backPlate', 8],
        ['cylinder', 4],
        ['faceMask', 11],
      ],
    )
    expect(frt.visibleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'backPlate:frt:msa:06', location: 'FRT' }),
        expect.objectContaining({ id: 'cylinder:frt:drager:9l-03', location: 'FRT' }),
        expect.objectContaining({ id: 'faceMask:frt:drager:02', location: 'FRT' }),
      ]),
    )

    const spare = getScbaCheckSummary({ mainLocation: 'FRT (Spare)' })
    expect(spare.totalCount).toBe(6)
    expect(
      spare.visibleSections.map((section) => [section.key, section.visibleRows.length]),
    ).toEqual([
      ['backPlate', 2],
      ['cylinder', 4],
    ])
    expect(spare.visibleRows.every((row) => row.location === 'FRT (Spare)')).toBe(true)

    const store = getScbaCheckSummary({ mainLocation: 'Store' })
    expect(store.totalCount).toBe(60)
    expect(
      store.visibleSections.map((section) => [section.key, section.visibleRows.length]),
    ).toEqual([
      ['backPlate', 17],
      ['cylinder', 27],
      ['faceMask', 16],
    ])
    expect(store.visibleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'backPlate:store:msa:01', location: 'Store' }),
        expect.objectContaining({ id: 'cylinder:store:drager:6l-01', location: 'Store' }),
        expect.objectContaining({ id: 'faceMask:store:drager:01', location: 'Store' }),
      ]),
    )
  })

  it('requires SCBA session details, complete visible rows, and remarks for issue fields', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'FRT',
      inspectionType: 'SCBA Inspection',
      inspectedAt: '2026-06-29T09:30',
      scbaInspectedBy: '',
      scbaInspectionDate: '',
      scbaBackPlateChecks: [
        {
          id: 'backPlate:frt:msa:06',
          location: 'FRT',
          brand: 'MSA',
          serialNo: '06',
          backPlateHarnessCondition: 'Not Good',
          highPressureHose: 'Good',
          pressureGauge: 'Good',
          alarmDevice: 'Good',
          demandValve: 'Good',
          sealing: 'Good',
          cleanliness: 'Good',
          remarks: '',
        },
      ],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      photos: [],
    })

    expect(incomplete).toEqual({
      inspectionType: false,
      inspectedAt: false,
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: false,
      frtDailyChecks: false,
      frtDailyRemarks: false,
      frtOneOffChecks: false,
      frtOneOffRemarks: false,
      hydraulicChecks: false,
      hydraulicRemarks: false,
      highAngleSession: false,
      highAngleChecks: false,
      highAngleRemarks: false,
      scbaSession: false,
      scbaChecks: true,
      scbaRemarks: true,
    })
  })

  it('separates incomplete SCBA statuses from missing Not Good remarks', () => {
    const incompleteStatuses = getInspectionFormMissingFields({
      mainLocation: 'Store',
      inspectionType: 'SCBA Inspection',
      scbaInspectedBy: 'Inspector SCBA',
      scbaInspectionDate: '2026-06-28',
      scbaBackPlateChecks: [
        {
          id: 'backPlate:store:msa:01',
          location: 'Store',
          brand: 'MSA',
          serialNo: '01',
          backPlateHarnessCondition: 'Good',
        },
      ],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
    })

    expect(incompleteStatuses.scbaSession).toBe(false)
    expect(incompleteStatuses.scbaChecks).toBe(true)
    expect(incompleteStatuses.scbaRemarks).toBe(false)
  })

  it('keeps the workbook-backed High Angle kit roster, order, and metadata stable', () => {
    expect(HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => definition.title)).toEqual([
      'Response Kit #1',
      'Response Kit #2',
      'Response Kit #3',
      'Stretcher Response Kit',
      'PPE and Auxillary Kit',
      'Arizona Vortex Tripod Kits',
      'Rescue Rope',
    ])

    expect(HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => definition.rowCount)).toEqual([
      24, 24, 14, 13, 6, 19, 11,
    ])

    expect(HIGH_ANGLE_KIT_DEFINITIONS[0].rows[0]).toMatchObject({
      rowNumber: '1',
      mainLocation: 'Response Kit #1',
      location: 'N/A',
      subLocation: 'N/A',
      equipment: 'Heavy Duty Organizer Bag',
      quantity: '1',
    })
    expect(HIGH_ANGLE_KIT_DEFINITIONS[2].rows[12]).toMatchObject({
      rowNumber: '61',
      mainLocation: 'Response Kit #3',
      location: 'Stuff Bag (Red)',
      subLocation: 'N/A',
      equipment: "I'D - S (Gold)",
      quantity: '1',
    })
    expect(HIGH_ANGLE_KIT_DEFINITIONS[5].rows[15]).toMatchObject({
      rowNumber: '97',
      mainLocation: 'Arizona Vortex Tripod Kits',
      equipment: 'AZORP (Arizona Omni Rigging Pod) Inner Kit (GOLD)',
      quantity: '1',
    })
    expect(HIGH_ANGLE_KIT_DEFINITIONS[6].rows[10]).toMatchObject({
      rowNumber: '111',
      mainLocation: 'Rescue Rope',
      equipment: 'Gotcha Rope',
      quantity: '0',
    })
  })

  it('filters visible High Angle rows by the selected kit roster', () => {
    const responseKit = buildInspectionPayloadSnapshot({
      mainLocation: 'Response Kit #1',
      inspectionType: 'High Angle Rescue Equipment Inspection',
      highAngleInspectedBy: 'Inspector Rope',
      highAngleInspectionDate: '2026-06-28',
      highAngleChecks: [
        {
          id: 'response-kit-1:1',
          rowNumber: '1',
          mainLocation: 'Response Kit #1',
          location: 'N/A',
          subLocation: 'N/A',
          equipment: 'Heavy Duty Organizer Bag',
          quantity: '1',
          condition: 'Good',
        },
      ],
    })

    expect(responseKit.highAngleChecks).toHaveLength(1)
    expect(responseKit.highAngleChecks[0]).toEqual(
      expect.objectContaining({
        rowNumber: '1',
        mainLocation: 'Response Kit #1',
        equipment: 'Heavy Duty Organizer Bag',
      }),
    )
    expect(responseKit.highAngleChecks.some((row) => row.mainLocation === 'Response Kit #2')).toBe(
      false,
    )

    const rope = buildInspectionPayloadSnapshot({
      mainLocation: 'Rescue Rope',
      inspectionType: 'High Angle Rescue Equipment Inspection',
      highAngleInspectedBy: 'Inspector Rope',
      highAngleInspectionDate: '2026-06-28',
      highAngleChecks: [],
    })

    expect(rope.highAngleChecks).toHaveLength(0)
  })

  it('normalizes High Angle checks and builds the seeded payload, checklist, and description', () => {
    const payload = buildInspectionPayloadSnapshot({
      mainLocation: 'Response Kit #1',
      inspectionType: 'High Angle Rescue Equipment Inspection',
      highAngleInspectedBy: 'Inspector Rope',
      highAngleInspectionDate: '2026-06-28',
      highAngleChecks: [
        {
          id: 'response-kit-1:1',
          rowNumber: '1',
          mainLocation: 'Response Kit #1',
          location: 'N/A',
          subLocation: 'N/A',
          equipment: 'Heavy Duty Organizer Bag',
          quantity: '1',
          condition: 'Good',
        },
        {
          id: 'response-kit-1:3',
          rowNumber: '3',
          mainLocation: 'Response Kit #1',
          location: 'Heavy Duty Organizer Bag',
          subLocation: 'Main Compartment',
          equipment: 'Locking Carabiner - CT - Steel - S',
          quantity: '10',
          condition: 'Not Good',
          remarks: 'Gate spring is sticking.',
        },
      ],
    })

    expect(payload.highAngleInspectedBy).toBe('Inspector Rope')
    expect(payload.highAngleInspectionDate).toBe('2026-06-28')
    expect(payload.highAngleChecks).toHaveLength(2)
    expect(payload.highAngleChecks[0]).toEqual(
      expect.objectContaining({
        rowNumber: '1',
        equipment: 'Heavy Duty Organizer Bag',
        condition: 'Good',
      }),
    )
    expect(payload.highAngleChecks.find((row) => row.rowNumber === '3')).toEqual(
      expect.objectContaining({
        rowNumber: '3',
        equipment: 'Locking Carabiner - CT - Steel - S',
        quantity: '10',
        condition: 'Not Good',
        remarks: 'Gate spring is sticking.',
      }),
    )
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Response Kit #1 - Locking Carabiner - CT - Steel - S: Not Good',
        }),
      ]),
    )
    expect(payload.description).toContain(
      'High Angle rescue equipment checked for Response Kit #1 by Inspector Rope on 2026-06-28.',
    )
    expect(payload.description).toContain('Issue row(s): 1.')
    expect(payload.description).toContain('Gate spring is sticking.')
  })

  it('requires High Angle session details, complete visible rows, and remarks for Not Good rows', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'Response Kit #1',
      inspectionType: 'High Angle Rescue Equipment Inspection',
      inspectedAt: '2026-06-29T09:30',
      highAngleInspectedBy: '',
      highAngleInspectionDate: '',
      highAngleChecks: [
        {
          id: 'response-kit-1:1',
          rowNumber: '1',
          mainLocation: 'Response Kit #1',
          location: 'N/A',
          subLocation: 'N/A',
          equipment: 'Heavy Duty Organizer Bag',
          quantity: '1',
          condition: 'Not Good',
          remarks: '',
        },
      ],
      photos: [],
    })

    expect(incomplete).toEqual({
      inspectionType: false,
      inspectedAt: false,
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: false,
      frtDailyChecks: false,
      frtDailyRemarks: false,
      frtOneOffChecks: false,
      frtOneOffRemarks: false,
      hydraulicChecks: false,
      hydraulicRemarks: false,
      highAngleSession: false,
      highAngleChecks: true,
      highAngleRemarks: true,
      scbaSession: false,
      scbaChecks: false,
      scbaRemarks: false,
    })
  })

  it('keeps the workbook-backed FRT roster, order, and reading rows stable', () => {
    expect(
      FRT_DAILY_SECTION_DEFINITIONS.map((section) => [section.title, section.rows.length]),
    ).toEqual([
      ['LOCKER 01', 6],
      ['LOCKER 02', 6],
      ['LOCKER 03', 7],
      ['LOCKER 04', 13],
      ['LOCKER 05', 13],
      ['LOCKER 06', 5],
      ['LOCKER 07', 1],
      ['LOCKER 08', 4],
      ['FIRE TRUCK', 37],
    ])
    expect(
      FRT_ONE_OFF_SECTION_DEFINITIONS.map((section) => [section.title, section.rows.length]),
    ).toEqual([
      ['TRUCK CHECKLIST', 23],
      ['LOCKER NO 01', 2],
      ['LOCKER NO 02', 2],
      ['LOCKER NO 03', 3],
      ['LOCKER NO 04', 6],
      ['LOCKER NO 05', 3],
      ['LOCKER NO 06', 2],
      ['LOCKER NO 07', 3],
      ['CREW CABIN', 2],
    ])
    expect(FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) => section.rows)).toHaveLength(92)
    expect(FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) => section.rows)).toHaveLength(46)
    expect(FRT_DAILY_SECTION_DEFINITIONS[0].rows[0]).toMatchObject({
      id: 'daily:fire-truck:1',
      location: 'LOCKER 01',
      equipment: 'FIRE HOSE 2.5"',
      quantity: '6',
      rowKind: 'status',
    })
    expect(FRT_DAILY_SECTION_DEFINITIONS[8].rows[35]).toMatchObject({
      id: 'daily:fire-truck:91',
      equipment: 'MILEAGE (ODOMETER)',
      rowKind: 'reading',
    })
    expect(FRT_DAILY_SECTION_DEFINITIONS[8].rows[36]).toMatchObject({
      id: 'daily:fire-truck:92',
      equipment: 'FUEL LEVEL (%)',
      rowKind: 'reading',
    })
    expect(FRT_ONE_OFF_SECTION_DEFINITIONS[0].rows[0]).toMatchObject({
      id: 'one-off:fire-truck:1',
      location: 'TRUCK CHECKLIST',
      equipment: 'POWER WINDOW',
    })
    expect(FRT_ONE_OFF_SECTION_DEFINITIONS[8].rows[1]).toMatchObject({
      id: 'one-off:fire-truck:46',
      location: 'CREW CABIN',
      equipment: 'RADIO SET : 1',
    })
  })

  it('filters FRT visible rows only for FIRE TRUCK and classifies reading rows correctly', () => {
    const fireTruck = getFrtCheckSummary({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
    })
    expect(fireTruck.selectedTruck).toBe('AJG9555')
    expect(fireTruck.dailyRows).toHaveLength(92)
    expect(fireTruck.oneOffRows).toHaveLength(46)
    expect(fireTruck.visibleDailySections.map((section) => section.title)).toEqual([
      'LOCKER 01',
      'LOCKER 02',
      'LOCKER 03',
      'LOCKER 04',
      'LOCKER 05',
      'LOCKER 06',
      'LOCKER 07',
      'LOCKER 08',
      'FIRE TRUCK',
    ])
    expect(
      fireTruck.dailyRows.filter((row) => row.rowKind === 'reading').map((row) => row.equipment),
    ).toEqual(['MILEAGE (ODOMETER)', 'FUEL LEVEL (%)'])

    const otherLocation = getFrtCheckSummary({ mainLocation: 'Store', selectedLocation: 'Store' })
    expect(otherLocation.dailyRows).toHaveLength(0)
    expect(otherLocation.oneOffRows).toHaveLength(0)
  })

  it('surfaces custom FRT compartments and custom items in the selected compartment', () => {
    const form = {
      mainLocation: 'AJG9555',
      selectedLocation: 'AJG9555',
      subLocation: 'ROOF LOCKER',
      frtTruckPlateNo: 'AJG9555',
      frtCustomCompartments: ['ROOF LOCKER'],
      frtTruckReference: { plateNo: 'AJG9555' },
      frtDailyChecks: [
        {
          id: 'custom:frt:daily:roof-locker-nozzle',
          checklistKind: 'daily',
          rowNumber: 'Custom',
          mainLocation: 'FIRE TRUCK',
          location: 'ROOF LOCKER',
          compartment: 'ROOF LOCKER',
          equipment: 'SPARE NOZZLE',
          quantity: '1',
          rowKind: 'status',
        },
      ],
      frtOneOffChecks: [],
    }

    const compartmentOptions = getFrtCompartmentOptions(form)
    const customCompartment = compartmentOptions.find((option) => option.value === 'ROOF LOCKER')
    const summary = getFrtCheckSummary(form)

    expect(customCompartment).toEqual(
      expect.objectContaining({
        title: 'ROOF LOCKER',
        description: 'Custom compartment',
      }),
    )
    expect(summary.dailyRows).toEqual([
      expect.objectContaining({
        id: 'custom:frt:daily:roof-locker-nozzle',
        equipment: 'SPARE NOZZLE',
        compartment: 'ROOF LOCKER',
      }),
    ])
    expect(summary.visibleDailySections.find((section) => section.title === 'ROOF LOCKER')).toEqual(
      expect.objectContaining({
        custom: true,
        visibleRows: [expect.objectContaining({ equipment: 'SPARE NOZZLE' })],
      }),
    )
  })

  it('builds the seeded FRT payload, checklist, and description consistently', () => {
    const payload = buildInspectionPayloadSnapshot({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
      subLocation: 'FIRE TRUCK',
      inspectionType: 'FRT Daily Inspection',
      frtInspectedBy: 'Inspector Truck',
      frtInspectionDate: '2026-06-29',
      frtShift: 'Day',
      frtTruckReference: {
        plateNo: 'AJG9555',
        roadTaxExpiry: '13/02/2026',
        insuranceExpiry: '13/02/2026',
        puspakomExpiry: '19/02/2026',
      },
      frtDailyRemarks: 'Truck ready for dispatch.',
      frtOneOffRemarks: 'One-off issues tracked.',
      frtDailyChecks: [
        {
          id: 'daily:fire-truck:1',
          rowNumber: '1',
          mainLocation: 'FIRE TRUCK',
          location: 'LOCKER 01',
          equipment: 'FIRE HOSE 2.5"',
          quantity: '6',
          rowKind: 'status',
          status: 'Checked',
          remarks: '',
        },
        {
          id: 'daily:fire-truck:90',
          rowNumber: '90',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'OVERALL BODY',
          quantity: 'N/A',
          rowKind: 'status',
          status: 'Issue',
          remarks: 'Panel dent needs repair.',
          photos: [
            {
              id: 'frt-daily-photo-1',
              fileName: 'frt-daily-photo.png',
              description: 'Panel dent evidence.',
              url: 'data:image/png;base64,AAAA',
            },
          ],
        },
        {
          id: 'daily:fire-truck:91',
          rowNumber: '91',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'MILEAGE (ODOMETER)',
          quantity: '',
          rowKind: 'reading',
          readingValue: '123456',
          remarks: '',
          additionalNotes: 'Reading confirmed after refuel.',
          additionalPhotos: [
            {
              id: 'frt-reading-additional-photo-1',
              fileName: 'frt-reading-additional-photo.png',
              description: 'Odometer context.',
              url: 'data:image/png;base64,CCCC',
            },
          ],
        },
        {
          id: 'daily:fire-truck:92',
          rowNumber: '92',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'FUEL LEVEL (%)',
          quantity: '',
          rowKind: 'reading',
          readingValue: '85',
          remarks: '',
        },
      ],
      frtOneOffChecks: [
        {
          id: 'one-off:fire-truck:1',
          rowNumber: '1',
          mainLocation: 'FIRE TRUCK',
          location: 'TRUCK CHECKLIST',
          equipment: 'POWER WINDOW',
          condition: 'Good',
          remarks: '',
          additionalNotes: 'Lubricated during inspection.',
          additionalPhotos: [
            {
              id: 'frt-one-off-additional-photo-1',
              fileName: 'frt-one-off-additional-photo.png',
              description: 'Power window context.',
              url: 'data:image/png;base64,DDDD',
            },
          ],
        },
        {
          id: 'one-off:fire-truck:16',
          rowNumber: '16',
          mainLocation: 'FIRE TRUCK',
          location: 'TRUCK CHECKLIST',
          equipment: 'ELECTRONIC SIREN',
          condition: 'Not Good',
          remarks: 'Mute switch sticking.',
          photos: [
            {
              id: 'frt-one-off-photo-1',
              fileName: 'frt-one-off-photo.png',
              description: 'Siren issue evidence.',
              url: 'data:image/png;base64,BBBB',
            },
          ],
        },
      ],
    })

    expect(payload.frtInspectedBy).toBe('Inspector Truck')
    expect(payload.frtInspectionDate).toBe('2026-06-29')
    expect(payload.frtShift).toBe('Day')
    expect(payload.frtTruckReference).toEqual(
      expect.objectContaining({
        plateNo: 'AJG9555',
        insuranceExpiry: '13/02/2026',
      }),
    )
    expect(payload.frtDailyChecks).toHaveLength(4)
    expect(payload.frtOneOffChecks).toHaveLength(2)
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '90')?.photos).toEqual([
      expect.objectContaining({ id: 'frt-daily-photo-1' }),
    ])
    expect(payload.frtOneOffChecks.find((row) => row.rowNumber === '16')?.photos).toEqual([
      expect.objectContaining({ id: 'frt-one-off-photo-1' }),
    ])
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '91')).toEqual(
      expect.objectContaining({
        equipment: 'MILEAGE (ODOMETER)',
        rowKind: 'reading',
        readingValue: '123456',
        additionalNotes: 'Reading confirmed after refuel.',
        additionalPhotos: [expect.objectContaining({ id: 'frt-reading-additional-photo-1' })],
      }),
    )
    expect(payload.frtOneOffChecks.find((row) => row.rowNumber === '1')).toEqual(
      expect.objectContaining({
        condition: 'Good',
        additionalNotes: 'Lubricated during inspection.',
        additionalPhotos: [expect.objectContaining({ id: 'frt-one-off-additional-photo-1' })],
      }),
    )
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '92')).toEqual(
      expect.objectContaining({
        equipment: 'FUEL LEVEL (%)',
        rowKind: 'reading',
        readingValue: '85',
      }),
    )
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Daily - OVERALL BODY: Issue' }),
        expect.objectContaining({ label: 'One-off - ELECTRONIC SIREN: Not Good' }),
      ]),
    )
    expect(payload.description).toContain(
      'Fire Truck Daily Readiness completed for AJG9555 on 2026-06-29 by Inspector Truck.',
    )
    expect(payload.description).toContain('Daily roster completed: 4/4.')
    expect(payload.description).toContain('One-off checklist completed: 2/2.')
    expect(payload.description).toContain(
      'Daily FIRE TRUCK / OVERALL BODY: Panel dent needs repair.',
    )
    expect(payload.description).toContain(
      'One-off TRUCK CHECKLIST / ELECTRONIC SIREN: Mute switch sticking.',
    )
  })

  it('normalizes mixed-case FRT row kinds to canonical values', () => {
    const payload = buildInspectionPayloadSnapshot({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
      subLocation: 'FIRE TRUCK',
      inspectionType: 'FRT Daily Inspection',
      frtInspectedBy: 'Inspector Truck',
      frtInspectionDate: '2026-06-29',
      frtShift: 'Day',
      frtTruckReference: {
        plateNo: 'AJG9555',
        roadTaxExpiry: '13/02/2026',
        insuranceExpiry: '13/02/2026',
        puspakomExpiry: '19/02/2026',
      },
      frtDailyChecks: [
        {
          id: 'daily:fire-truck:90',
          rowNumber: '90',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'OVERALL BODY',
          quantity: 'N/A',
          rowKind: 'STATUS',
          status: 'Checked',
          remarks: '',
        },
        {
          id: 'daily:fire-truck:91',
          rowNumber: '91',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'MILEAGE (ODOMETER)',
          quantity: '',
          rowKind: 'Reading',
          readingValue: '123456',
        },
      ],
      frtOneOffChecks: [
        {
          id: 'one-off:fire-truck:1',
          rowNumber: '1',
          mainLocation: 'FIRE TRUCK',
          location: 'TRUCK CHECKLIST',
          equipment: 'POWER WINDOW',
          condition: 'Good',
          remarks: '',
        },
      ],
      frtDailyRemarks: '',
      frtOneOffRemarks: '',
    })

    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '90')?.rowKind).toBe('status')
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '91')?.rowKind).toBe('reading')
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '91')).toEqual(
      expect.objectContaining({
        rowNumber: '91',
        rowKind: 'reading',
        readingValue: '123456',
      }),
    )
  })

  it('requires FRT session details, readings, statuses, and issue remarks', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
      subLocation: 'FIRE TRUCK',
      inspectionType: 'FRT Daily Inspection',
      inspectedAt: '2026-06-29T09:30',
      frtInspectedBy: '',
      frtInspectionDate: '',
      frtShift: '',
      frtDailyChecks: [
        {
          id: 'daily:fire-truck:90',
          rowNumber: '90',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'OVERALL BODY',
          quantity: 'N/A',
          rowKind: 'status',
          status: 'Issue',
          remarks: '',
        },
        {
          id: 'daily:fire-truck:91',
          rowNumber: '91',
          mainLocation: 'FIRE TRUCK',
          location: 'FIRE TRUCK',
          equipment: 'MILEAGE (ODOMETER)',
          quantity: '',
          rowKind: 'reading',
          readingValue: '',
          remarks: '',
        },
      ],
      frtOneOffChecks: [
        {
          id: 'one-off:fire-truck:16',
          rowNumber: '16',
          mainLocation: 'FIRE TRUCK',
          location: 'TRUCK CHECKLIST',
          equipment: 'ELECTRONIC SIREN',
          condition: 'Not Good',
          remarks: '',
        },
      ],
      photos: [],
    })

    expect(incomplete).toEqual({
      inspectionType: false,
      inspectedAt: false,
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: false,
      frtCompartment: false,
      frtDailyChecks: true,
      frtDailyRemarks: true,
      frtOneOffChecks: true,
      frtOneOffRemarks: true,
      hydraulicChecks: false,
      hydraulicRemarks: false,
      highAngleSession: false,
      highAngleChecks: false,
      highAngleRemarks: false,
      scbaSession: false,
      scbaChecks: false,
      scbaRemarks: false,
    })
  })

  it('accepts complete FRT issue rows with remarks and photo evidence', () => {
    const dailyChecks = FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) => section.rows).map(
      (row) => {
        if (row.id === 'daily:fire-truck:90') {
          return {
            ...row,
            status: 'Issue',
            readingValue: '',
            remarks: 'Panel dent needs repair.',
            photos: [
              {
                id: 'frt-daily-photo-1',
                fileName: 'frt-daily-photo.png',
                url: 'data:image/png;base64,AAAA',
              },
            ],
          }
        }
        return {
          ...row,
          status: row.rowKind === 'reading' ? '' : 'Checked',
          readingValue: row.rowKind === 'reading' ? '100' : '',
          remarks: '',
          photos: [],
        }
      },
    )
    const oneOffChecks = FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) => section.rows).map(
      (row) =>
        row.id === 'one-off:fire-truck:16'
          ? {
              ...row,
              condition: 'Not Good',
              remarks: 'Mute switch sticking.',
              photos: [
                {
                  id: 'frt-one-off-photo-1',
                  fileName: 'frt-one-off-photo.png',
                  url: 'data:image/png;base64,BBBB',
                },
              ],
            }
          : { ...row, condition: 'Good', remarks: '', photos: [] },
    )

    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
      subLocation: 'FIRE TRUCK',
      inspectionType: 'FRT Daily Inspection',
      inspectedAt: '2026-06-29T09:30',
      frtInspectedBy: 'Inspector Truck',
      frtInspectionDate: '2026-06-29',
      frtShift: 'Day',
      frtDailyChecks: dailyChecks,
      frtOneOffChecks: oneOffChecks,
      photos: [],
    })

    expect(incomplete).toEqual(
      expect.objectContaining({
        frtSession: false,
        frtCompartment: false,
        frtDailyChecks: false,
        frtDailyRemarks: false,
        frtOneOffChecks: false,
        frtOneOffRemarks: false,
      }),
    )
  })

  it('appends helper text without erasing existing notes or duplicating chips', () => {
    expect(appendInspectionText('', 'Normal condition observed')).toBe('Normal condition observed')
    expect(appendInspectionText('Existing note', 'Follow-up required')).toBe(
      'Existing note\nFollow-up required',
    )
    expect(appendInspectionText('Existing note\nFollow-up required', 'Follow-up required')).toBe(
      'Existing note\nFollow-up required',
    )
  })

  it('returns type-specific checklist chips with generic fallback', () => {
    expect(getInspectionChecklistChips('Hydraulic Rescue Tools Inspection')).toEqual([
      'Physical condition checked',
      'Mechanical condition checked',
      'No leakage checked',
      'Function test recorded',
    ])
    expect(getInspectionChecklistChips('General Inspection')).toEqual([])
    expect(getInspectionChecklistChips('Other Inspection')).toContain('Area checked')
    expect(getInspectionChecklistChips('Unknown Type')).toContain('Condition recorded')
  })

  it('keeps hydraulic workbook seed rows visible when catalog coverage is partial', () => {
    const visibleChecks = getHydraulicVisibleChecks({
      mainLocation: 'FRT',
      hydraulicEquipmentRows: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          mainLocation: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          equipmentId: 1,
          equipmentDescription: 'Primary power unit',
          equipmentSource: 'seed',
          canEdit: true,
          canDelete: true,
        },
      ],
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
        },
      ],
    })

    expect(visibleChecks).toHaveLength(6)
    expect(visibleChecks.map((row) => row.equipment)).toEqual([
      'Hydraulic Pump Motor 1',
      'Hydraulic Hose 1',
      'Hydraulic Spreader 1',
      'Hydraulic Cutter 1',
      'Hydraulic Combi 1',
      'Hydraulic Cylinder Ramp 1',
    ])
    expect(visibleChecks[0]).toMatchObject({
      id: 'frt:hydraulic-pump-motor-1',
      equipmentId: 1,
      equipmentDescription: 'Primary power unit',
      canEdit: true,
      canDelete: true,
      isWorkbookSeedRow: true,
      isExtensionRow: false,
      physicalCondition: 'OK',
    })
  })

  it('appends unmatched hydraulic catalog and saved rows after workbook seed rows', () => {
    const visibleChecks = getHydraulicVisibleChecks({
      mainLocation: 'FRT',
      hydraulicEquipmentRows: [
        {
          id: 'hydraulic-custom-1',
          location: 'FRT',
          mainLocation: 'FRT',
          equipment: 'Hydraulic Ram Extension',
          equipmentSource: 'custom',
          canEdit: true,
          canDelete: true,
        },
      ],
      hydraulicChecks: [
        {
          id: 'hydraulic-custom-2',
          location: 'FRT',
          mainLocation: 'FRT',
          equipment: 'Hydraulic Wedge',
          equipmentSource: 'custom',
          functionTest: 'Defect',
        },
      ],
    })

    expect(visibleChecks).toHaveLength(8)
    expect(visibleChecks.slice(0, 6).every((row) => row.isWorkbookSeedRow === true)).toBe(true)
    expect(visibleChecks.slice(6)).toEqual([
      expect.objectContaining({
        equipment: 'Hydraulic Ram Extension',
        isWorkbookSeedRow: false,
        isExtensionRow: true,
      }),
      expect.objectContaining({
        equipment: 'Hydraulic Wedge',
        isWorkbookSeedRow: false,
        isExtensionRow: true,
      }),
    ])
  })

  it('keeps saved fire extinguisher rows visible when catalog coverage is partial', () => {
    const visibleChecks = getFireExtinguisherVisibleChecks({
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:1',
          catalogId: 'fe:1',
          sourceRowNumber: '1',
          zone: 'Zone 1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          feType: 'DP 6KG',
          certificationValidity: '2026-12-01',
        },
      ],
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 'fe:1',
          sourceRowNumber: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          physicalCondition: 'Good',
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'Yes',
          operationalCondition: 'Good',
        },
        {
          id: 'fe:999',
          sourceRowNumber: '999',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-999',
          barcodeNo: 'EE042021Y999999',
          feType: 'CO2 5KG',
          certificationValidity: '2024-01-01',
          physicalCondition: 'Not Good',
          physicalConditionRemarks: 'Cylinder body dented.',
        },
      ],
    })

    expect(visibleChecks).toHaveLength(2)
    expect(visibleChecks[0]).toMatchObject({
      id: 'fe:1',
      zone: 'Zone 1',
      idLocNo: 'ADO-001',
      isOrphanedSavedRow: false,
    })
    expect(visibleChecks[1]).toMatchObject({
      id: 'fe:999',
      idLocNo: 'ADO-999',
      barcodeNo: 'EE042021Y999999',
      physicalCondition: 'Not Good',
      physicalConditionRemarks: 'Cylinder body dented.',
      isOrphanedSavedRow: true,
    })
  })

  it('keeps fire extinguisher merged counts and descriptions aligned with the merged visible set', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'Fire Extinguisher Inspection',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      selectedLocation: 'Manjung Hub > Reception',
      fireExtinguisherInspectedBy: 'Inspector Fire',
      fireExtinguisherInspectionDate: '2026-06-29',
      fireExtinguisherCatalogRows: [
        {
          id: 'fe:1',
          catalogId: 'fe:1',
          sourceRowNumber: '1',
          zone: 'Zone 1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          certificationValidity: '2026-12-01',
        },
      ],
      fireExtinguisherChecks: [
        {
          id: 'fe:1',
          catalogId: 'fe:1',
          sourceRowNumber: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-001',
          barcodeNo: 'EE042021Y544896',
          physicalCondition: 'Good',
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'Yes',
          operationalCondition: 'Good',
        },
        {
          id: 'fe:999',
          sourceRowNumber: '999',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          idLocNo: 'ADO-999',
          barcodeNo: 'EE042021Y999999',
          physicalCondition: 'Not Good',
          physicalConditionRemarks: 'Cylinder body dented.',
          physicalConditionPhotos: [
            {
              id: 'fe-photo-999',
              fileName: 'dented-body.jpg',
              description: 'Cylinder body defect',
              url: 'data:image/png;base64,defect999',
            },
          ],
          signageCondition: 'Good',
          boxKeyAvailability: 'Yes',
          boxGlassAvailability: 'Yes',
          operationalCondition: 'Good',
          remarks: 'Needs replacement.',
        },
      ],
    })

    const summary = getFireExtinguisherCheckSummary(form)
    const payload = buildInspectionPayloadSnapshot(form)

    expect(summary.totalCount).toBe(2)
    expect(summary.completedCount).toBe(2)
    expect(summary.defectCount).toBe(1)
    expect(summary.defectFieldCount).toBe(1)
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'ADO-999 - FE Physical Condition: Not Good',
        }),
      ]),
    )
    expect(payload.description).toContain(
      'Fire extinguishers checked at Zone 1 > Manjung Hub > Reception.',
    )
    expect(payload.description).toContain('Defect/remark item(s): 1.')
    expect(payload.description).toContain(
      '- ADO-999 - FE Physical Condition: Cylinder body dented.',
    )
    expect(payload.description).toContain(
      '- ADO-999 - General equipment remarks: Needs replacement.',
    )
  })

  it('appends SCBA extension rows after workbook rows inside static sections', () => {
    const visibleSections = getScbaVisibleSections({
      mainLocation: 'FRT',
      scbaBackPlateChecks: [
        {
          id: 'backPlate:frt:msa:06',
          sectionKey: 'backPlate',
          location: 'FRT',
          mainLocation: 'FRT',
          brand: 'MSA',
          serialNo: '06',
          backPlateHarnessCondition: 'Good',
        },
        {
          id: 'backPlate-extra-1',
          sectionKey: 'backPlate',
          location: 'FRT',
          mainLocation: 'FRT',
          brand: 'MSA',
          serialNo: 'R-99',
          equipmentSource: 'custom',
          isCustomEquipment: true,
        },
      ],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      scbaCustomSections: [
        {
          id: 'customScba-regulator',
          key: 'customScba-regulator',
          title: 'Regulator',
          shortLabel: 'Regulator',
          fields: [{ key: 'purgeValve', label: 'Purge Valve', kind: 'status' }],
          rows: [
            {
              id: 'customScba-regulator:frt:msa:r-01',
              location: 'FRT',
              mainLocation: 'FRT',
              brand: 'MSA',
              serialNo: 'R-01',
              purgeValve: 'Good',
            },
          ],
        },
      ],
    })

    const backPlateSection = visibleSections.find((section) => section.key === 'backPlate')
    const customSection = visibleSections.find((section) => section.key === 'customScba-regulator')
    const seededBackPlateRow = backPlateSection.visibleRows.find(
      (row) => row.id === 'backPlate:frt:msa:06',
    )
    const extraBackPlateRow = backPlateSection.visibleRows.find(
      (row) => row.id === 'backPlate-extra-1',
    )

    expect(seededBackPlateRow).toMatchObject({
      id: 'backPlate:frt:msa:06',
      isWorkbookSeedRow: true,
      isExtensionRow: false,
    })
    expect(backPlateSection.visibleRows.at(-1)).toMatchObject({
      id: 'backPlate-extra-1',
      isWorkbookSeedRow: false,
      isExtensionRow: true,
      isCustomEquipment: true,
    })
    expect(extraBackPlateRow).toMatchObject({
      id: 'backPlate-extra-1',
      isWorkbookSeedRow: false,
      isExtensionRow: true,
      isCustomEquipment: true,
    })
    expect(customSection.visibleRows[0]).toMatchObject({
      id: 'customScba-regulator:frt:msa:r-01',
      isWorkbookSeedRow: false,
      isExtensionRow: true,
    })
  })

  it('appends High Angle extension rows after workbook reference rows for a selected kit', () => {
    const visibleChecks = getHighAngleVisibleChecks({
      mainLocation: 'Response Kit #1',
      highAngleChecks: [
        {
          id: 'response-kit-1:999',
          mainLocation: 'Response Kit #1',
          location: 'Main Compartment',
          subLocation: 'Extensions',
          equipment: 'Custom Anchor',
          quantity: '1',
          condition: 'Good',
        },
      ],
    })

    expect(visibleChecks[0]).toMatchObject({
      rowNumber: '1',
      isWorkbookSeedRow: true,
      isExtensionRow: false,
    })
    expect(visibleChecks.at(-1)).toMatchObject({
      id: 'response-kit-1:999',
      equipment: 'Custom Anchor',
      isWorkbookSeedRow: false,
      isExtensionRow: true,
    })
  })

  it('toggles structured checklist state and appends readable description text once', () => {
    const selected = toggleInspectionChecklistItem(
      {
        ...baseForm,
        description: 'Existing note',
      },
      'Physical condition checked',
      '2026-06-26T01:00:00.000Z',
    )

    expect(
      isInspectionChecklistItemSelected(
        selected.checklist,
        baseForm.inspectionType,
        'Physical condition checked',
      ),
    ).toBe(true)
    expect(selected.description).toBe('Existing note\nPhysical condition checked')
    expect(selected.checklist[0]).toEqual({
      id: 'hydraulic-rescue-tools-inspection:physical-condition-checked',
      label: 'Physical condition checked',
      inspectionType: baseForm.inspectionType,
      selected: true,
      selectedAt: '2026-06-26T01:00:00.000Z',
    })

    const deselected = toggleInspectionChecklistItem(selected, 'Physical condition checked')
    expect(
      isInspectionChecklistItemSelected(
        deselected.checklist,
        baseForm.inspectionType,
        'Physical condition checked',
      ),
    ).toBe(false)
    expect(deselected.description).toBe('Existing note\nPhysical condition checked')
  })

  it('requires High Angle issue photos and treats cleared-status evidence as retained audit context', () => {
    const form = normalizeInspectionForm({
      inspectionType: 'High Angle Rescue Equipment Inspection',
      mainLocation: 'Response Kit #1',
      highAngleChecks: [
        {
          id: 'response-kit-1:3',
          mainLocation: 'Response Kit #1',
          equipment: 'Locking Carabiner - CT - Steel - S',
          rowNumber: '3',
          condition: 'Not Good',
          conditionRemarks: 'Gate spring is sticking.',
          conditionPhotos: [],
          additionalNotes: 'Stored in upper pouch.',
          additionalPhotos: [basePhotos[1]],
        },
      ],
      photos: [],
    })

    expect(getInspectionFormMissingFields(form).highAngleRemarks).toBe(true)

    const withPhoto = normalizeInspectionForm({
      ...form,
      highAngleChecks: [
        {
          ...form.highAngleChecks[0],
          conditionPhotos: [basePhotos[0]],
        },
      ],
    })
    expect(getInspectionFormMissingFields(withPhoto).highAngleRemarks).toBe(false)
    expect(getHighAngleCheckSummary(withPhoto).incompletePhotoCount).toBe(0)

    const retained = normalizeInspectionForm({
      ...withPhoto,
      highAngleChecks: [
        {
          ...withPhoto.highAngleChecks[0],
          condition: 'Good',
        },
      ],
    })
    expect(getHighAngleCheckSummary(retained).issueCount).toBe(0)
    expect(
      getHighAngleRetainedEvidenceRows(getHighAngleCheckSummary(retained).visibleChecks),
    ).toHaveLength(1)
    const retainedPayloadRow = buildInspectionPayloadSnapshot(retained).highAngleChecks.find(
      (row) => row.id === 'response-kit-1:3',
    )
    expect(retainedPayloadRow).toMatchObject({
      condition: 'Good',
      [HIGH_ANGLE_CONDITION_FIELD.remarksKey]: 'Gate spring is sticking.',
      [HIGH_ANGLE_CONDITION_FIELD.photosKey]: [basePhotos[0]],
      additionalNotes: 'Stored in upper pouch.',
      additionalPhotos: [basePhotos[1]],
    })
  })

  it('requires SCBA issue photos and keeps field evidence in payload snapshots', () => {
    const field = SCBA_SECTION_DEFINITIONS[0].fields.find(
      (candidate) => candidate.key === 'highPressureHose',
    )
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
    const form = normalizeInspectionForm({
      inspectionType: 'SCBA Inspection',
      mainLocation: 'FRT',
      scbaBackPlateChecks: [
        {
          id: 'backplate:frt:msa:06',
          location: 'FRT',
          brand: 'MSA',
          serialNo: '06',
          backPlateHarnessCondition: 'Good',
          highPressureHose: 'Not Good',
          pressureGauge: 'Good',
          alarmDevice: 'Good',
          demandValve: 'Good',
          sealing: 'Good',
          cleanliness: 'Good',
          remarks: 'General SCBA row note.',
          photos: [basePhotos[0]],
          [remarksKey]: 'Hose coupling worn.',
          [photosKey]: [],
        },
      ],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      photos: [],
    })

    expect(getInspectionFormMissingFields(form).scbaRemarks).toBe(true)
    expect(getScbaCheckSummary(form).incompletePhotoCount).toBe(1)

    const withPhoto = normalizeInspectionForm({
      ...form,
      scbaBackPlateChecks: [
        {
          ...form.scbaBackPlateChecks[0],
          [photosKey]: [basePhotos[1]],
        },
      ],
    })
    expect(getInspectionFormMissingFields(withPhoto).scbaRemarks).toBe(false)
    expect(getScbaCheckSummary(withPhoto).incompletePhotoCount).toBe(0)

    const payload = buildInspectionPayloadSnapshot(withPhoto)
    expect(payload.scbaBackPlateChecks[0]).toMatchObject({
      remarks: 'General SCBA row note.',
      photos: [basePhotos[0]],
      highPressureHose: 'Not Good',
      [remarksKey]: 'Hose coupling worn.',
      [photosKey]: [basePhotos[1]],
    })
    expect(payload.description).toContain('High Pressure Hose: Hose coupling worn.')
    expect(payload.description).not.toContain('General SCBA row note.')

    const withoutAdditionalPhoto = normalizeInspectionForm({
      ...withPhoto,
      scbaBackPlateChecks: [{ ...withPhoto.scbaBackPlateChecks[0], photos: [] }],
    })
    expect(createInspectionFormSignature(withPhoto)).not.toBe(
      createInspectionFormSignature(withoutAdditionalPhoto),
    )
  })

  it('retains completed Fire Extinguisher rows from multiple locations in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'Fire Extinguisher Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Zone 1 > Manjung Hub > Reception',
        fireExtinguisherInspectedBy: 'Inspector Fire',
        fireExtinguisherInspectionDate: '2026-07-08',
        fireExtinguisherCatalogRows: [
          {
            id: 'fe:1',
            catalogId: '1',
            sourceRowNumber: '1',
            zone: 'Zone 1',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            idLocNo: 'ADO-001',
            barcodeNo: 'EE042021Y544896',
            feType: 'DP 6KG',
          },
          {
            id: 'fe:2',
            catalogId: '2',
            sourceRowNumber: '2',
            zone: 'Zone 1',
            mainLocation: 'Canteen',
            subLocation: 'Canteen',
            idLocNo: 'CEN-001',
            barcodeNo: 'EE042021Y544897',
            feType: 'CO2 9KG',
          },
        ],
        fireExtinguisherChecks: [
          {
            id: 'fe:1',
            catalogId: '1',
            zone: 'Zone 1',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            idLocNo: 'ADO-001',
            barcodeNo: 'EE042021Y544896',
            physicalCondition: 'Good',
            signageCondition: 'Good',
            boxKeyAvailability: 'Yes',
            boxGlassAvailability: 'Yes',
            operationalCondition: 'Good',
          },
          {
            id: 'fe:2',
            catalogId: '2',
            zone: 'Zone 1',
            mainLocation: 'Canteen',
            subLocation: 'Canteen',
            idLocNo: 'CEN-001',
            barcodeNo: 'EE042021Y544897',
            physicalCondition: 'Good',
            signageCondition: 'Good',
            boxKeyAvailability: 'Yes',
            boxGlassAvailability: 'Yes',
            operationalCondition: 'Good',
          },
        ],
      }),
    )

    expect(payload.fireExtinguisherChecks.map((row) => row.idLocNo)).toEqual(
      expect.arrayContaining(['ADO-001', 'CEN-001']),
    )
    expect(payload.fireExtinguisherChecks).toHaveLength(2)
  })

  it('retains completed ER Aux rows from multiple locations in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Store',
        erAuxInspectedBy: 'Inspector ER',
        erAuxInspectionDate: '2026-07-08',
        erAuxChecks: [
          {
            id: 'store:fire-jacket',
            location: 'Store',
            equipment: 'Fire Jacket',
            quantity: '15',
            condition: 'OK',
          },
          {
            id: 'office:radio-tetra',
            location: 'Office',
            equipment: 'Radio Tetra',
            quantity: '7',
            condition: 'Missing',
            additionalNotes: 'Missing in office closet.',
          },
        ],
      }),
    )

    expect(payload.erAuxChecks.map((row) => row.equipment)).toEqual(
      expect.arrayContaining(['Fire Jacket', 'Radio Tetra']),
    )
    expect(payload.erAuxChecks.some((row) => row.location === 'Store')).toBe(true)
    expect(payload.erAuxChecks.some((row) => row.location === 'Office')).toBe(true)
    expect(payload.erAuxChecks).toHaveLength(2)
  })

  it('retains completed Hydraulic Rescue Tools rows from multiple locations in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'Hydraulic Rescue Tools Inspection',
        mainLocation: 'FRT',
        hydraulicInspectedBy: 'Inspector Hydraulic',
        hydraulicChecks: [
          {
            id: 'frt:hydraulic-pump-motor-1',
            location: 'FRT',
            mainLocation: 'FRT',
            equipment: 'Hydraulic Pump Motor 1',
            physicalCondition: 'OK',
            mechanicalCondition: 'OK',
            noLeakage: 'OK',
            functionTest: 'OK',
          },
          {
            id: 'store:hydraulic-hose-2',
            location: 'Store',
            mainLocation: 'Store',
            equipment: 'Hydraulic Hose 2',
            physicalCondition: 'N/A',
            mechanicalCondition: 'N/A',
            noLeakage: 'N/A',
            functionTest: 'N/A',
            functionTestRemarks: 'Not required for this kit.',
            noLeakageRemarks: 'No leak check needed.',
          },
        ],
      }),
    )

    expect(payload.hydraulicChecks.map((row) => row.location)).toEqual(
      expect.arrayContaining(['FRT', 'Store']),
    )
    expect(payload.hydraulicChecks).toHaveLength(2)
  })

  it('retains completed FRT Daily rows from multiple route compartments in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'FRT Daily Inspection',
        mainLocation: 'FIRE TRUCK',
        selectedLocation: 'FIRE TRUCK',
        frtTruckPlateNo: 'AJG9555',
        frtInspectedBy: 'Inspector Truck',
        frtInspectionDate: '2026-07-08',
        frtShift: 'Day',
        frtDailyChecks: [
          {
            id: 'daily:fire-truck:1',
            rowNumber: '1',
            rowKind: 'status',
            mainLocation: 'FIRE TRUCK',
            location: 'LOCKER 01',
            compartment: 'LOCKER 01',
            equipment: 'Fire Extinguisher',
            quantity: '1',
            status: 'Checked',
            photos: [],
          },
          {
            id: 'daily:fire-truck:2',
            rowNumber: '2',
            rowKind: 'status',
            mainLocation: 'FIRE TRUCK',
            location: 'LOCKER 02',
            compartment: 'LOCKER 02',
            equipment: 'Hose Wrench',
            quantity: '1',
            status: 'Checked',
            photos: [],
          },
        ],
        frtOneOffChecks: [
          {
            id: 'one-off:fire-truck:16',
            rowNumber: '16',
            rowKind: 'status',
            mainLocation: 'FIRE TRUCK',
            location: 'LOCKER 01',
            compartment: 'LOCKER 01',
            equipment: 'Sextant',
            condition: 'Good',
            photos: [],
          },
          {
            id: 'one-off:fire-truck:17',
            rowNumber: '17',
            rowKind: 'status',
            mainLocation: 'FIRE TRUCK',
            location: 'LOCKER 02',
            compartment: 'LOCKER 02',
            equipment: 'Rescue Rope',
            condition: 'Good',
            photos: [],
          },
        ],
      }),
    )

    expect(payload.frtDailyChecks.length).toBe(2)
    expect(payload.frtOneOffChecks.length).toBe(2)
    expect(payload.frtDailyChecks.map((row) => row.location)).toEqual(
      expect.arrayContaining(['LOCKER 01', 'LOCKER 02']),
    )
  })

  it('retains completed High Angle rows from multiple kits in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'High Angle Rescue Equipment Inspection',
        mainLocation: 'Response Kit #1',
        highAngleInspectedBy: 'Inspector Rope',
        highAngleInspectionDate: '2026-07-08',
        highAngleChecks: [
          {
            id: 'response-kit-1:1',
            rowNumber: '1',
            mainLocation: 'Response Kit #1',
            location: 'N/A',
            subLocation: 'N/A',
            equipment: 'Heavy Duty Organizer Bag',
            quantity: '1',
            condition: 'Good',
          },
          {
            id: 'rescue-rope:101',
            rowNumber: '101',
            mainLocation: 'Rescue Rope',
            location: 'N/A',
            subLocation: 'N/A',
            equipment: 'Rope',
            quantity: '1',
            condition: 'Good',
          },
        ],
      }),
    )

    expect(payload.highAngleChecks.map((row) => row.mainLocation)).toEqual(
      expect.arrayContaining(['Response Kit #1', 'Rescue Rope']),
    )
    expect(payload.highAngleChecks).toHaveLength(2)
  })

  it('retains completed SCBA rows from multiple locations in review payload', () => {
    const payload = buildInspectionPayloadSnapshot(
      normalizeInspectionForm({
        inspectionType: 'SCBA Inspection',
        mainLocation: 'FRT',
        scbaInspectedBy: 'Inspector SCBA',
        scbaInspectionDate: '2026-07-08',
        scbaBackPlateChecks: [
          {
            id: 'backPlate:frt:msa:06',
            location: 'FRT',
            brand: 'MSA',
            serialNo: '06',
            backPlateHarnessCondition: 'Good',
            remarks: 'Back plate retained for backup.',
          },
        ],
        scbaCylinderChecks: [
          {
            id: 'cylinder:store:msa:6l-01',
            location: 'Store',
            brand: 'MSA',
            serialNo: '6L-01',
            size: '6',
            cylinderType: 'Steel',
            remarks: 'Cylinder relocated.',
          },
        ],
        scbaFaceMaskChecks: [
          {
            id: 'faceMask:store:drager:01',
            location: 'Store',
            brand: 'Drager',
            serialNo: '01',
            remarks: 'Face mask checked in store.',
          },
        ],
      }),
    )

    expect(payload.scbaBackPlateChecks.map((row) => row.location)).toEqual(
      expect.arrayContaining(['FRT']),
    )
    expect(payload.scbaCylinderChecks.map((row) => row.location)).toEqual(
      expect.arrayContaining(['Store']),
    )
    expect(payload.scbaFaceMaskChecks).toHaveLength(1)
    expect(payload.scbaCylinderChecks).toHaveLength(1)
    expect(payload.scbaBackPlateChecks).toHaveLength(1)
  })
})
