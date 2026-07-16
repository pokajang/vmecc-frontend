import { describe, expect, it } from 'vitest'
import {
  getInspectionHierarchyGroupKey,
  getInspectionHierarchyLabels,
  resolveInspectionHierarchy,
} from '../domain/inspectionHierarchy'

describe('inspection hierarchy', () => {
  it('maps Fire Truck rows to truck and compartment without zone placeholders', () => {
    const hierarchy = resolveInspectionHierarchy({
      source: { key: 'frt-daily-inspection' },
      row: { location: 'LOCKER 02' },
      form: { frtTruckId: 'truck-1', frtTruckPlateNo: 'AJG9555' },
    })

    expect(hierarchy).toEqual(
      expect.objectContaining({
        zone: '',
        mainLocation: 'AJG9555',
        subLocation: 'LOCKER 02',
      }),
    )
    expect(getInspectionHierarchyLabels({ key: 'frt-daily-inspection' })).toEqual(
      expect.objectContaining({ groupSingular: 'compartment', groupPlural: 'compartments' }),
    )
  })

  it('maps High Angle N/A storage rows to a meaningful general-kit group', () => {
    expect(
      resolveInspectionHierarchy({
        source: { key: 'high-angle-rescue-equipment-inspection' },
        row: { mainLocation: 'Response Kit #1', location: 'N/A', subLocation: 'N/A' },
      }),
    ).toEqual(
      expect.objectContaining({
        mainLocation: 'Response Kit #1',
        subLocation: 'General kit items',
      }),
    )
  })

  it('keeps equal labels under different parent ids as separate groups', () => {
    const first = getInspectionHierarchyGroupKey({
      mainLocationId: 'area-1',
      mainLocation: 'Store',
      subLocation: 'Bay 1',
    })
    const second = getInspectionHierarchyGroupKey({
      mainLocationId: 'area-2',
      mainLocation: 'Store',
      subLocation: 'Bay 1',
    })

    expect(first).not.toBe(second)
  })
})
