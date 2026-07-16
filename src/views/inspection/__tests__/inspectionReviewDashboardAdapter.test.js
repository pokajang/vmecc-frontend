import { describe, expect, it } from 'vitest'
import { buildInspectionReviewDashboardItem } from '../records/inspectionReviewDashboardAdapter'

describe('inspection review dashboard adapter', () => {
  it('keeps item photos with their location and report photos in a final separate group', () => {
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
    expect(item.locationRows[0].photoCount).toBe(2)
    expect(item.locationRows[0].photoGroups.map((group) => group.title)).toEqual([
      'Portable Pump - Defect Photos',
      'Portable Pump - Additional Photos',
    ])
    expect(item.reportPhotoGroups).toEqual([
      expect.objectContaining({
        title: 'Additional Report Evidence',
        photos: [expect.objectContaining({ id: 'general-photo' })],
      }),
    ])
  })

  it('does not classify neutral or incomplete statuses as issues', () => {
    const item = buildInspectionReviewDashboardItem({
      key: 'er-aux-equipment-inspection',
      inspectionType: 'ER Aux Equipment Inspection',
      groups: [
        { mainLocation: 'Store', label: 'Spare radio', status: 'N/A' },
        { mainLocation: 'Store', label: 'Helmet', status: 'Needs attention' },
        { mainLocation: 'Store', label: 'Boot', status: 'Missing' },
      ],
      form: { mainLocation: 'Store' },
    })

    expect(item.metrics.issueCount).toBe(1)
    expect(item.issueGroups).toHaveLength(1)
    expect(item.issueGroups[0].rows.map((row) => row.title)).toEqual(['Boot'])
  })
})
