import { describe, expect, it } from 'vitest'
import { buildInspectionReviewDashboardItem } from '../records/inspectionReviewDashboardAdapter'

describe('inspection review dashboard adapter', () => {
  it('collects general, defect, and additional photos into the matching location row', () => {
    const item = buildInspectionReviewDashboardItem({
      key: 'er-aux-equipment-inspection',
      inspectionType: 'Emergency Response Auxiliary Equipment Inspection',
      title: 'Emergency Response Auxiliary Equipment',
      metrics: { count: 1, checkedCount: 1, defectCount: 1 },
      groups: [
        {
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          label: 'Portable Pump',
          status: 'Issue',
        },
      ],
      form: {
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        photos: [{ id: 'general-photo', fileName: 'general.jpg' }],
        erAuxChecks: [
          {
            zone: '1',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            equipment: 'Portable Pump',
            defectPhotos: [{ id: 'defect-photo', fileName: 'defect.jpg' }],
            additionalPhotos: [{ id: 'additional-photo', fileName: 'additional.jpg' }],
          },
        ],
      },
    })

    expect(item.locationRows).toHaveLength(1)
    expect(item.locationRows[0].photoCount).toBe(3)
    expect(item.locationRows[0].photoGroups.map((group) => group.title)).toEqual([
      'General Evidence Photos',
      'Portable Pump - Defect Photos',
      'Portable Pump - Additional Photos',
    ])
  })
})
