import { describe, expect, it } from 'vitest'
import {
  appendInspectionText,
  buildInspectionDraftPayload,
  buildInspectionPayloadSnapshot,
  buildInspectionReviewRecord,
  buildInspectionSubmittedRecord,
  formatInspectionLocation,
  getFrtCheckSummary,
  getInspectionChecklistChips,
  getInspectionFormValidationState,
  getInspectionFormMissingFields,
  getInspectionDraftMeta,
  getHydraulicCheckSummary,
  getScbaCheckSummary,
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
} from '../types/frt-daily/helpers'
import {
  filterFireExtinguisherRows,
  getFireExtinguisherCheckSummary,
  normalizeFireExtinguisherChecks,
} from '../types/fire-extinguisher/helpers'
import { HIGH_ANGLE_KIT_DEFINITIONS } from '../types/high-angle/helpers'
import { SCBA_SECTION_DEFINITIONS } from '../types/scba/helpers'

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
      mainLocation: 'Zone 2',
      subLocation: '',
      mainLocationId: '',
      subLocationId: '',
      inspectionType: 'ER Aux Equipment Inspection',
      description: 'Equipment quantity and condition recorded.',
      photos: basePhotos,
      checklist: [],
      erAuxInspectedBy: '',
      erAuxInspectionDate: '',
      erAuxChecks: [],
      erAuxEquipmentRows: [],
      fireExtinguisherInspectedBy: '',
      fireExtinguisherInspectionDate: '',
      fireExtinguisherChecks: [],
      fireExtinguisherCatalogRows: [],
      frtInspectedBy: '',
      frtInspectionDate: '',
      frtShift: '',
      frtTruckReference: {
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
      highAngleChecks: [],
      scbaInspectedBy: '',
      scbaInspectionDate: '',
      scbaBackPlateChecks: [],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
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
      user: { name: 'Inspector' },
    })

    expect(reviewRecord.status).toBe('Draft')
    expect(reviewRecord.submittedAt).toBe('')
    expect(reviewRecord.submittedBy).toBe('')
    expect(reviewRecord.checklist).toHaveLength(1)
    expect(reviewRecord.checklistVersion).toBe('inspection-checklist-v1')

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
    expect(submittedRecord.checklist[0].label).toBe('Physical condition checked')
    expect(submittedRecord.checklistVersion).toBe('inspection-checklist-v1')
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
      selectedLocation: true,
      description: false,
      photos: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: true,
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
    })

    expect(findingPayload.hseSelections).toEqual(['unsafeAct', 'unsafeCondition'])
    expect(findingPayload.checklist.map((item) => item.label)).toEqual([
      'Unsafe Act',
      'Unsafe Condition',
    ])
    expect(findingPayload.description).toContain('Unsafe Act, Unsafe Condition')
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
    })
    expect(findingState.firstTarget).toEqual({
      field: 'hseDetails',
      detailKey: 'hseSeverity',
    })
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

    expect(summary.totalCount).toBe(2)
    expect(summary.checkedCount).toBe(2)
    expect(summary.visibleChecks).toHaveLength(2)
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
        operationalCondition: 'Operational',
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
        operationalCondition: 'Not Operational',
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
        certificationValidityRaw: 'Removed',
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
        certificationValidityRaw: 'Removed',
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
          operationalCondition: 'Operational',
        },
      ],
    }

    const summary = getFireExtinguisherCheckSummary(form)
    expect(summary.totalCount).toBe(1)
    expect(summary.completedCount).toBe(1)
    expect(summary.defectCount).toBe(1)
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

  it('returns exact Fire Extinguisher validation row targets for statuses and defect remarks', () => {
    const baseFireForm = {
      mainLocation: 'Manjung Hub',
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
          operationalCondition: 'Operational',
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
    expect(missingRemarkState.firstTarget).toEqual({
      field: 'fireExtinguisherRemarks',
      rowId: 'fe:1',
      checkKey: '',
      detailKey: 'physicalConditionRemarks',
    })
  })

  it('requires complete hydraulic checks and defect evidence for hydraulic review', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'FRT',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
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
    expect(payload.description).toContain('ER Aux equipment checked at Store by Inspector One')
    expect(payload.description).toContain('Chainsaw (qty 0) - Missing: Sent for replacement.')
  })

  it('requires ER Aux session details, quantities, conditions, and issue remarks for review', () => {
    const incomplete = getInspectionFormMissingFields({
      mainLocation: 'Store',
      inspectionType: 'ER Aux Equipment Inspection',
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
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: true,
      erAuxChecks: true,
      erAuxRemarks: true,
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
      'Back Plate MSA 06: High Pressure Hose - Hose coupling worn.',
    )
    expect(payload.description).toContain(
      'Face Mask Drager 02: Leak Test - Leak test failed on seal.',
    )
    expect(payload.checklist).toHaveLength(2)
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Back Plate MSA 06 - High Pressure Hose: Not Good' }),
        expect.objectContaining({ label: 'Face Mask Drager 02 - Leak Test: Not Good' }),
      ]),
    )
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
      scbaSession: true,
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

    expect(responseKit.highAngleChecks).toHaveLength(24)
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

    expect(rope.highAngleChecks).toHaveLength(11)
    expect(rope.highAngleChecks[0]).toMatchObject({
      rowNumber: '101',
      mainLocation: 'Rescue Rope',
    })
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
    expect(payload.highAngleChecks).toHaveLength(24)
    expect(payload.highAngleChecks[0]).toEqual(
      expect.objectContaining({
        rowNumber: '1',
        equipment: 'Heavy Duty Organizer Bag',
        condition: 'Good',
      }),
    )
    expect(payload.highAngleChecks[2]).toEqual(
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
      highAngleSession: true,
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
    expect(fireTruck.selectedTruck).toBe('FIRE TRUCK')
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

  it('builds the seeded FRT payload, checklist, and description consistently', () => {
    const payload = buildInspectionPayloadSnapshot({
      mainLocation: 'FIRE TRUCK',
      selectedLocation: 'FIRE TRUCK',
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
        },
        {
          id: 'one-off:fire-truck:16',
          rowNumber: '16',
          mainLocation: 'FIRE TRUCK',
          location: 'TRUCK CHECKLIST',
          equipment: 'ELECTRONIC SIREN',
          condition: 'Not Good',
          remarks: 'Mute switch sticking.',
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
    expect(payload.frtDailyChecks).toHaveLength(92)
    expect(payload.frtOneOffChecks).toHaveLength(46)
    expect(payload.frtDailyChecks[90]).toEqual(
      expect.objectContaining({
        equipment: 'MILEAGE (ODOMETER)',
        rowKind: 'reading',
        readingValue: '123456',
      }),
    )
    expect(payload.frtDailyChecks[91]).toEqual(
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
      'FRT Daily inspection checked for FIRE TRUCK on 2026-06-29 (Day shift) by Inspector Truck.',
    )
    expect(payload.description).toContain('Daily roster completed: 4/92.')
    expect(payload.description).toContain('One-off checklist completed: 2/46.')
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
          id: 'daily:fire-truck:1',
          rowNumber: '1',
          mainLocation: 'FIRE TRUCK',
          location: 'LOCKER 01',
          equipment: 'FIRE HOSE 2.5"',
          quantity: '6',
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

    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '1')?.rowKind).toBe('status')
    expect(payload.frtDailyChecks.find((row) => row.rowNumber === '91')?.rowKind).toBe('reading')
    expect(payload.frtDailyChecks[90]).toEqual(
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
      inspectionType: 'FRT Daily Inspection',
      frtInspectedBy: '',
      frtInspectionDate: '',
      frtShift: '',
      frtDailyChecks: [
        {
          id: 'daily:fire-truck:1',
          rowNumber: '1',
          mainLocation: 'FIRE TRUCK',
          location: 'LOCKER 01',
          equipment: 'FIRE HOSE 2.5"',
          quantity: '6',
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
      selectedLocation: false,
      photos: false,
      description: false,
      erAuxSession: false,
      erAuxChecks: false,
      erAuxRemarks: false,
      frtSession: true,
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
    expect(getInspectionChecklistChips('Other Inspection')).toContain('Area checked')
    expect(getInspectionChecklistChips('Unknown Type')).toContain('Condition recorded')
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
})
