import { describe, expect, it } from 'vitest'
import { isSummaryComplete } from '../types/continuationHelpers'
import { buildErAuxChecklist, getErAuxCheckSummary } from '../types/er-aux/helpers'
import {
  buildHydraulicChecklist,
  getHydraulicCheckSummary,
  HYDRAULIC_CHECK_FIELDS,
} from '../types/hydraulic/helpers'
import {
  buildHighAngleChecklist,
  getHighAngleCheckSummary,
  HIGH_ANGLE_KIT_DEFINITIONS,
} from '../types/high-angle/helpers'
import {
  buildScbaChecklist,
  getScbaCheckSummary,
  getScbaFieldEvidenceKeys,
  SCBA_SECTION_DEFINITIONS,
} from '../types/scba/helpers'

const photo = { id: 'evidence-photo', url: 'data:image/png;base64,AAA' }

const isReadyForContinuation = (summary, missingFields) =>
  isSummaryComplete({ summary, missingFields })

describe('evidence-aware inspection completion', () => {
  it('keeps ER Aux and hydraulic issue rows out of checked progress until their evidence is complete', () => {
    const erAuxIssue = {
      id: 'er-aux:issue',
      equipment: 'Fire Jacket',
      quantity: '1',
      condition: 'Defect',
      defectRemarks: '',
      defectPhotos: [],
    }
    const erAuxIncomplete = getErAuxCheckSummary({}, { checks: [erAuxIssue] })
    const erAuxComplete = getErAuxCheckSummary(
      {},
      {
        checks: [{ ...erAuxIssue, defectRemarks: 'Torn sleeve.', defectPhotos: [photo] }],
      },
    )

    expect(erAuxIncomplete.checkedCount).toBe(0)
    expect(isReadyForContinuation(erAuxIncomplete, { erAuxRemarks: true })).toBe(false)
    expect(erAuxComplete.checkedCount).toBe(1)
    expect(isReadyForContinuation(erAuxComplete, { erAuxRemarks: false })).toBe(true)
    expect(buildErAuxChecklist({}, { checks: [erAuxIssue] })).toHaveLength(1)

    const hydraulicIssue = {
      equipment: 'Hydraulic Pump',
      ...Object.fromEntries(HYDRAULIC_CHECK_FIELDS.map((field) => [field.key, 'OK'])),
      physicalCondition: 'N/A',
      physicalConditionRemarks: '',
    }
    const hydraulicIncomplete = getHydraulicCheckSummary({}, { checks: [hydraulicIssue] })
    const hydraulicComplete = getHydraulicCheckSummary(
      {},
      { checks: [{ ...hydraulicIssue, physicalConditionRemarks: 'Not fitted.' }] },
    )

    expect(hydraulicIncomplete.checkedCount).toBe(0)
    expect(isReadyForContinuation(hydraulicIncomplete, { hydraulicRemarks: true })).toBe(false)
    expect(hydraulicComplete.checkedCount).toBe(1)
    expect(isReadyForContinuation(hydraulicComplete, { hydraulicRemarks: false })).toBe(true)
    expect(buildHydraulicChecklist({}, { checks: [hydraulicIssue] })).toHaveLength(
      HYDRAULIC_CHECK_FIELDS.length,
    )
  })

  it('only emits completed High Angle and SCBA checklist entries after issue evidence is complete', () => {
    const kit = HIGH_ANGLE_KIT_DEFINITIONS[0].title
    const highAngleIssue = {
      id: 'high-angle:issue',
      mainLocation: kit,
      rowNumber: '1',
      equipment: 'Rescue Rope',
      condition: 'Not Good',
      conditionRemarks: '',
      conditionPhotos: [],
    }
    const highAngleIncomplete = getHighAngleCheckSummary(
      { mainLocation: kit },
      { checks: [highAngleIssue] },
    )
    const highAngleComplete = getHighAngleCheckSummary(
      { mainLocation: kit },
      { checks: [{ ...highAngleIssue, conditionRemarks: 'Frayed sheath.' }] },
    )

    expect(highAngleIncomplete.checkedCount).toBe(0)
    expect(isReadyForContinuation(highAngleIncomplete, { highAngleRemarks: true })).toBe(false)
    expect(
      buildHighAngleChecklist({ mainLocation: kit }, { checks: [highAngleIssue] }),
    ).toHaveLength(1)
    expect(highAngleComplete.checkedCount).toBe(1)
    expect(isReadyForContinuation(highAngleComplete, { highAngleRemarks: false })).toBe(true)
    expect(
      buildHighAngleChecklist(
        { mainLocation: kit },
        { checks: [{ ...highAngleIssue, conditionRemarks: 'Frayed sheath.' }] },
      ),
    ).toHaveLength(2)

    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const issueField = section.fields.find((field) => field.key === 'highPressureHose')
    const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(issueField)
    const scbaIssue = {
      id: 'scba:issue',
      label: 'MSA 06',
      ...Object.fromEntries(
        section.fields.map((field) => [field.key, field.kind === 'status' ? 'Good' : 'Recorded']),
      ),
      [issueField.key]: 'Not Good',
      [remarksKey]: '',
      [photosKey]: [],
    }
    const scbaSections = (row, checkedCount, incompletePhotoCount) => [
      {
        ...section,
        visibleRows: [row],
        checkedCount,
        issueCount: 1,
        incompleteRemarksCount: incompletePhotoCount > 0 ? 1 : 0,
        incompletePhotoCount,
        retainedEvidenceCount: 0,
      },
    ]
    const scbaIncomplete = getScbaCheckSummary({}, { sections: scbaSections(scbaIssue, 0, 1) })
    const scbaCompleteRow = { ...scbaIssue, [remarksKey]: 'Worn hose coupling.' }
    const scbaComplete = getScbaCheckSummary({}, { sections: scbaSections(scbaCompleteRow, 1, 0) })

    expect(scbaIncomplete.checkedCount).toBe(0)
    expect(isReadyForContinuation(scbaIncomplete, { scbaRemarks: true })).toBe(false)
    expect(buildScbaChecklist({}, { sections: scbaSections(scbaIssue, 0, 1) })).toHaveLength(1)
    expect(scbaComplete.checkedCount).toBe(1)
    expect(isReadyForContinuation(scbaComplete, { scbaRemarks: false })).toBe(true)
    expect(buildScbaChecklist({}, { sections: scbaSections(scbaCompleteRow, 1, 0) })).toHaveLength(
      2,
    )
  })
})
