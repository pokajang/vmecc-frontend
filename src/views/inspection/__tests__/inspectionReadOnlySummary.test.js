import { describe, expect, it } from 'vitest'
import { buildFrtDetailFindingItems } from '../types/frt-daily/detail'
import { getFrtCheckSummary, getFrtReadOnlySummary } from '../types/frt-daily/helpers'
import { buildScbaDetailFindingItems } from '../types/scba/detail'
import { getScbaCheckSummary, getScbaReadOnlySummary } from '../types/scba/helpers'

const fireTruckForm = (patch = {}) => ({
  mainLocation: 'FIRE TRUCK',
  frtTruckPlateNo: 'AJG9555',
  frtTruckReference: { plateNo: 'AJG9555' },
  frtDailyChecks: [],
  frtOneOffChecks: [],
  ...patch,
})

describe('inspection persisted read-only summaries', () => {
  it('keeps an empty Fire Truck daily category empty for a crew-cabin-only report', () => {
    const form = fireTruckForm({
      frtOneOffChecks: [
        {
          id: 'one-off:fire-truck:45',
          rowNumber: '45',
          mainLocation: 'FIRE TRUCK',
          location: 'CREW CABIN',
          equipment: 'BA SET : 4',
          condition: 'Good',
        },
      ],
    })

    const summary = getFrtReadOnlySummary(form)
    const items = buildFrtDetailFindingItems(form, summary)

    expect(summary.dailyRows).toEqual([])
    expect(summary.oneOffRows).toHaveLength(1)
    expect(summary.visibleDailySections.flatMap((section) => section.visibleRows)).toEqual([])
    expect(items.map((item) => item.title)).toEqual(['BA SET : 4'])
  })

  it('keeps an empty Fire Truck one-off category empty for a daily-only report', () => {
    const form = fireTruckForm({
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
        },
      ],
    })

    const summary = getFrtReadOnlySummary(form)
    const items = buildFrtDetailFindingItems(form, summary)

    expect(summary.dailyRows).toHaveLength(1)
    expect(summary.oneOffRows).toEqual([])
    expect(summary.visibleOneOffSections.flatMap((section) => section.visibleRows)).toEqual([])
    expect(items.map((item) => item.title)).toEqual(['FIRE HOSE 2.5"'])
  })

  it('does not render seeded Fire Truck rows for an empty persisted report', () => {
    const form = fireTruckForm()
    const seededEditSummary = getFrtCheckSummary(form)

    expect(seededEditSummary.visibleChecks.length).toBeGreaterThan(0)
    expect(buildFrtDetailFindingItems(form, seededEditSummary)).toEqual([])
    expect(getFrtReadOnlySummary(form).visibleChecks).toEqual([])
  })

  it('builds SCBA read-only sections from saved rows only, including historical rows without ids', () => {
    const form = {
      mainLocation: 'FRT',
      scbaBackPlateChecks: [
        {
          location: 'FRT',
          brand: 'MSA',
          serialNo: '06',
          backPlateHarnessCondition: 'Good',
        },
      ],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      scbaCustomSections: [],
    }

    const summary = getScbaReadOnlySummary(form)
    const items = buildScbaDetailFindingItems(form, summary)

    expect(summary.visibleSections.map((section) => section.title)).toEqual(['Back Plate'])
    expect(summary.visibleRows).toHaveLength(1)
    expect(summary.visibleRows[0].id).toBe('backPlate:frt:msa:06')
    expect(items.map((item) => item.title)).toEqual(['MSA 06'])
  })

  it('does not render seeded SCBA rows for an empty persisted report', () => {
    const form = {
      mainLocation: 'FRT',
      scbaBackPlateChecks: [],
      scbaCylinderChecks: [],
      scbaFaceMaskChecks: [],
      scbaCustomSections: [],
    }
    const seededEditSummary = getScbaCheckSummary(form)

    expect(seededEditSummary.visibleRows.length).toBeGreaterThan(0)
    expect(buildScbaDetailFindingItems(form, seededEditSummary)).toEqual([])
    expect(getScbaReadOnlySummary(form).visibleSections).toEqual([])
  })
})
