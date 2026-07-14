import { describe, expect, it } from 'vitest'
import {
  getInspectionTypeDefinition,
  getInspectionTypeInitialFormState,
  getInspectionTypeOptions,
  usesDirectInspectionSubmission,
} from '../app/inspectionTypeRegistry'

describe('inspectionTypeRegistry', () => {
  it('derives incident type options from the registered type definitions', () => {
    const options = getInspectionTypeOptions()

    expect(options.some((option) => option.value === 'ER Aux Equipment Inspection')).toBe(true)
    expect(options.some((option) => option.value === 'Fire Truck Daily Readiness')).toBe(true)
    expect(options.some((option) => option.value === 'Hydraulic Rescue Tools Inspection')).toBe(
      true,
    )
    expect(options.some((option) => option.value === 'SCBA Inspection')).toBe(true)
    expect(
      options.some((option) => option.value === 'High Angle Rescue Equipment Inspection'),
    ).toBe(true)
    expect(options.some((option) => option.value === 'General Inspection')).toBe(true)
  })

  it('returns structured type definitions for implemented structured inspection types', () => {
    const erAux = getInspectionTypeDefinition('ER Aux Equipment Inspection')
    const frt = getInspectionTypeDefinition('FRT Daily Inspection')
    const hydraulic = getInspectionTypeDefinition('Hydraulic Rescue Tools Inspection')
    const scba = getInspectionTypeDefinition('SCBA Inspection')
    const highAngle = getInspectionTypeDefinition('High Angle Rescue Equipment Inspection')
    const general = getInspectionTypeDefinition('General Inspection')

    expect(erAux?.formMode).toBe('structured')
    expect(typeof erAux?.getSummary).toBe('function')
    expect(typeof erAux?.EditSection).toBe('function')

    expect(frt?.formMode).toBe('structured')
    expect(frt?.supportsSubLocations).toBe(true)
    expect(typeof frt?.getSummary).toBe('function')
    expect(typeof frt?.ReadOnlySection).toBe('function')

    expect(hydraulic?.formMode).toBe('structured')
    expect(typeof hydraulic?.getSummary).toBe('function')
    expect(typeof hydraulic?.ReadOnlySection).toBe('function')

    expect(scba?.formMode).toBe('structured')
    expect(typeof scba?.getSummary).toBe('function')
    expect(typeof scba?.ReadOnlySection).toBe('function')

    expect(highAngle?.formMode).toBe('structured')
    expect(typeof highAngle?.getSummary).toBe('function')
    expect(typeof highAngle?.ReadOnlySection).toBe('function')

    expect(general?.formMode).toBe('generic')
    expect(typeof general?.getSummary).toBe('function')
    expect(typeof general?.ReadOnlySection).toBe('function')
  })

  it('aggregates per-type initial form state fragments', () => {
    expect(getInspectionTypeInitialFormState()).toMatchObject({
      erAuxInspectedBy: '',
      erAuxInspectionDate: '',
      erAuxChecks: [],
      erAuxEquipmentRows: [],
      frtInspectedBy: '',
      frtInspectionDate: '',
      frtShift: '',
      frtTruckId: '',
      frtTruckPlateNo: '',
      frtDailyChecks: [],
      frtDailyRemarks: '',
      frtOneOffChecks: [],
      frtOneOffRemarks: '',
      hydraulicChecks: [],
      hydraulicEquipmentRows: [],
      highAngleInspectedBy: '',
      highAngleInspectionDate: '',
      highAngleChecks: [],
      scbaInspectedBy: '',
      scbaInspectionDate: '',
      scbaBackPlateChecks: [],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
    })
  })

  it('enables direct submission only for the current HSE payload contract', () => {
    expect(
      usesDirectInspectionSubmission({
        inspectionType: 'Health Safety Environment Inspection',
        hsePayloadVersion: 2,
      }),
    ).toBe(true)
    expect(
      usesDirectInspectionSubmission({
        inspectionType: 'Health Safety Environment Inspection',
        hsePayloadVersion: 0,
      }),
    ).toBe(false)
    expect(usesDirectInspectionSubmission({ inspectionType: 'General Inspection' })).toBe(false)
  })
})
