import { describe, expect, it } from 'vitest'
import { FIRE_EXTINGUISHER_CHECK_FIELDS } from '../types/fire-extinguisher/helpers'
import { HYDRAULIC_CHECK_FIELDS } from '../types/hydraulic/helpers'
import { HIGH_ANGLE_CONDITION_FIELD } from '../types/high-angle/helpers'
import {
  buildErAuxResetPatch,
  buildFireExtinguisherResetPatch,
  buildFrtResetPatch,
  buildHighAngleResetPatch,
  buildHydraulicResetPatch,
  buildScbaResetPatch,
  hasErAuxInspectionData,
  hasFireExtinguisherInspectionData,
  hasFrtInspectionData,
  hasHighAngleInspectionData,
  hasHydraulicInspectionData,
  hasScbaInspectionData,
} from '../form/inspectionResetActions'

describe('inspection reset actions', () => {
  it('clears fire extinguisher inspection statuses and evidence', () => {
    const row = {
      physicalCondition: 'Good',
      operationalCondition: 'Not Good',
      operationalConditionRemarks: 'Jammed',
      operationalConditionPhotos: [{ id: 'photo-1' }],
      remarks: 'Near generator',
      photos: [{ id: 'photo-2' }],
    }

    expect(hasFireExtinguisherInspectionData(row, FIRE_EXTINGUISHER_CHECK_FIELDS)).toBe(true)

    const patch = buildFireExtinguisherResetPatch(FIRE_EXTINGUISHER_CHECK_FIELDS)
    expect({ ...row, ...patch }).toEqual(
      expect.objectContaining({
        physicalCondition: '',
        operationalCondition: '',
        operationalConditionRemarks: '',
        operationalConditionPhotos: [],
        remarks: '',
        photos: [],
      }),
    )
  })

  it('clears hydraulic statuses, N/A reasons, defect evidence, and additional info', () => {
    const row = {
      physicalCondition: 'N/A',
      physicalConditionRemarks: 'Not installed',
      mechanicalCondition: 'Defect',
      mechanicalConditionRemarks: 'Leak',
      mechanicalConditionPhotos: [{ id: 'photo-1' }],
      remarks: 'Pump bay',
      photos: [{ id: 'photo-2' }],
    }

    expect(hasHydraulicInspectionData(row, HYDRAULIC_CHECK_FIELDS)).toBe(true)

    const patch = buildHydraulicResetPatch(HYDRAULIC_CHECK_FIELDS)
    expect({ ...row, ...patch }).toEqual(
      expect.objectContaining({
        physicalCondition: '',
        physicalConditionRemarks: '',
        mechanicalCondition: '',
        mechanicalConditionRemarks: '',
        mechanicalConditionPhotos: [],
        remarks: '',
        photos: [],
      }),
    )
  })

  it('clears ER/AUX condition and restores quantity to the default value', () => {
    const row = {
      defaultQuantity: '15',
      quantity: '14',
      condition: 'Defect',
      defectRemarks: 'Torn',
      defectPhotos: [{ id: 'photo-1' }],
      additionalNotes: 'Shelf A',
      photos: [{ id: 'photo-2' }],
    }

    expect(hasErAuxInspectionData(row)).toBe(true)

    expect(buildErAuxResetPatch(row)).toEqual({
      quantity: '15',
      condition: '',
      remarks: '',
      defectRemarks: '',
      additionalNotes: '',
      defectPhotos: [],
      photos: [],
    })
  })

  it('clears high angle condition and retained evidence', () => {
    const row = {
      condition: 'Good',
      remarks: 'Old issue',
      [HIGH_ANGLE_CONDITION_FIELD.remarksKey]: 'Old issue',
      [HIGH_ANGLE_CONDITION_FIELD.photosKey]: [{ id: 'photo-1' }],
      additionalNotes: 'Top shelf',
      additionalPhotos: [{ id: 'photo-2' }],
    }

    expect(hasHighAngleInspectionData(row)).toBe(true)

    expect(buildHighAngleResetPatch()).toEqual({
      condition: '',
      remarks: '',
      conditionRemarks: '',
      conditionPhotos: [],
      additionalNotes: '',
      additionalPhotos: [],
    })
  })

  it('clears FRT daily and one-off row fields', () => {
    expect(
      hasFrtInspectionData({
        status: 'Issue',
        remarks: 'Leak',
        photos: [{ id: 'p1' }],
        additionalNotes: 'Cabinet note',
        additionalPhotos: [{ id: 'p2' }],
      }),
    ).toBe(true)
    expect(buildFrtResetPatch({ checklistKind: 'daily' })).toEqual({
      status: '',
      readingValue: '',
      remarks: '',
      photos: [],
      additionalNotes: '',
      additionalPhotos: [],
    })
    expect(buildFrtResetPatch({ checklistKind: 'oneOff' })).toEqual({
      condition: '',
      remarks: '',
      photos: [],
      additionalNotes: '',
      additionalPhotos: [],
    })
  })

  it('clears SCBA configured fields and issue evidence while preserving metadata outside the patch', () => {
    const fields = [
      { key: 'containedPressure', kind: 'text' },
      { key: 'physicalCondition', kind: 'status' },
    ]
    const row = {
      brand: 'MSA',
      serialNo: '01',
      containedPressure: '280',
      physicalCondition: 'Not Good',
      physicalConditionRemarks: 'Cracked',
      physicalConditionPhotos: [{ id: 'photo-1' }],
      remarks: 'Store shelf',
      photos: [{ id: 'photo-2' }],
    }

    expect(hasScbaInspectionData(row, fields)).toBe(true)

    const resetRow = { ...row, ...buildScbaResetPatch(fields) }
    expect(resetRow).toEqual(
      expect.objectContaining({
        brand: 'MSA',
        serialNo: '01',
        containedPressure: '',
        physicalCondition: '',
        physicalConditionRemarks: '',
        physicalConditionPhotos: [],
        remarks: '',
        photos: [],
      }),
    )
  })
})
