import { describe, expect, it } from 'vitest'
import { buildGeneralDetailFindingItems } from '../types/general/detail'
import { buildHydraulicDetailFindingItems } from '../types/hydraulic/detail'
import { buildScbaDetailFindingItems } from '../types/scba/detail'

describe('inspection record detail grouping', () => {
  it('keeps General findings under their captured location', () => {
    const items = buildGeneralDetailFindingItems({
      zone: '2',
      mainLocation: 'Workshop',
      subLocation: 'Pump Room',
      inspectionIssues: [{ id: 'finding-1', description: 'Blocked access.' }],
    })

    expect(items[0].groupLabel).toBe('2 > Workshop > Pump Room')
  })

  it('separates Hydraulic equipment by operational location', () => {
    const items = buildHydraulicDetailFindingItems(
      { mainLocation: 'FRT' },
      {
        visibleChecks: [
          { id: 'pump-1', equipment: 'Pump', mainLocation: 'FRT' },
          { id: 'cutter-1', equipment: 'Cutter', mainLocation: 'Store' },
        ],
      },
    )

    expect(items.map((item) => item.groupLabel)).toEqual(['FRT', 'Store'])
  })

  it('separates SCBA records by location and equipment section', () => {
    const items = buildScbaDetailFindingItems(
      {
        mainLocation: 'FRT',
        scbaBackPlateChecks: [{ id: 'bp-1' }],
        scbaCylinderChecks: [{ id: 'cylinder-1' }],
      },
      {
        visibleSections: [
          { title: 'Back Plate', fields: [], visibleRows: [{ id: 'bp-1', location: 'FRT' }] },
          {
            title: 'Cylinder',
            fields: [],
            visibleRows: [{ id: 'cylinder-1', location: 'Store' }],
          },
        ],
      },
    )

    expect(items.map((item) => item.groupLabel)).toEqual(['FRT > Back Plate', 'Store > Cylinder'])
  })
})
