import { describe, expect, it } from 'vitest'
import {
  applyFireExtinguisherAreaCompletionProgress,
  applyFireExtinguisherLocationProgress,
  applyFireExtinguisherZoneCompletionProgress,
} from '../form/fireExtinguisherProgressSelectors'

const completeRow = {
  id: 'fe:1',
  catalogId: 1,
  canonicalAssetKey: 'catalog:1',
  zone: '1',
  mainLocation: 'Manjung Hub',
  subLocation: 'Reception',
  physicalCondition: 'Good',
  signageCondition: 'Good',
  boxKeyAvailability: 'N/A',
  boxGlassAvailability: 'N/A',
  operationalCondition: 'Good',
}

const incompleteRow = {
  id: 'fe:2',
  catalogId: 2,
  canonicalAssetKey: 'catalog:2',
  zone: '1',
  mainLocation: 'Manjung Hub',
  subLocation: 'Workshop',
}

describe('fireExtinguisherProgressSelectors', () => {
  it('calculates location progress from local check rows', () => {
    const options = applyFireExtinguisherLocationProgress({
      options: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Workshop', title: 'Workshop' },
      ],
      extinguisherRows: [completeRow, incompleteRow],
      level: 'subLocation',
      showActiveProgress: true,
      zone: 'Zone 1',
      mainLocation: 'Manjung Hub',
    })

    expect(options[0]).toMatchObject({
      metaLabel: '1/1 checked',
      metaTone: 'success',
      progress: { inspectedCount: 1, totalCount: 1, isDone: true },
    })
    expect(options[1]).toMatchObject({
      metaLabel: '0/1 checked',
      progress: { inspectedCount: 0, totalCount: 1, isDone: false },
    })
  })

  it('keeps location progress optimistic while server progress is stale', () => {
    const justCompletedRow = {
      ...completeRow,
      id: 'fe:2',
      catalogId: 2,
      canonicalAssetKey: 'catalog:2',
      subLocation: 'Reception',
    }
    const options = applyFireExtinguisherLocationProgress({
      options: [{ value: 'Reception', title: 'Reception' }],
      extinguisherRows: [completeRow, justCompletedRow],
      locationProgress: [
        {
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          status: 'in_progress',
          expectedCount: 2,
          completedCount: 1,
        },
      ],
      level: 'subLocation',
      showActiveProgress: true,
      zone: 'Zone 1',
      mainLocation: 'Manjung Hub',
    })

    expect(options[0]).toMatchObject({
      metaLabel: '2/2 checked',
      metaTone: 'success',
      progress: { inspectedCount: 2, totalCount: 2, isDone: true },
    })
  })

  it('surfaces completed local defects as issues without success decoration', () => {
    const defectRow = {
      ...completeRow,
      physicalCondition: 'Not Good',
      physicalConditionRemarks: 'Cylinder body dented.',
    }
    const options = applyFireExtinguisherLocationProgress({
      options: [{ value: 'Reception', title: 'Reception', metaIconKey: 'check' }],
      extinguisherRows: [defectRow],
      level: 'subLocation',
      showActiveProgress: true,
      zone: 'Zone 1',
      mainLocation: 'Manjung Hub',
    })

    expect(options[0]).toMatchObject({
      metaLabel: '1/1 checked • 1 issue',
      metaTone: 'danger',
      metaIconKey: '',
      progress: { inspectedCount: 1, totalCount: 1, issueCount: 1, isDone: true },
    })
  })

  it('calculates area and zone completion from session progress rows', () => {
    const locationProgress = [
      {
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        status: 'completed',
        expectedCount: 1,
        completedCount: 1,
      },
      {
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Workshop',
        status: 'in_progress',
        expectedCount: 1,
        completedCount: 0,
      },
    ]

    const areaOptions = applyFireExtinguisherAreaCompletionProgress({
      options: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      locationProgress,
      showActiveProgress: true,
      zone: 'Zone 1',
    })
    const zoneOptions = applyFireExtinguisherZoneCompletionProgress({
      options: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      locationProgress,
      showActiveProgress: true,
    })

    expect(areaOptions[0]).toMatchObject({
      metaLabel: '1/2 locations',
      metaTone: 'muted',
      progress: { completedCount: 1, totalCount: 2, isDone: false },
    })
    expect(zoneOptions[0]).toMatchObject({
      metaLabel: '0/1 area',
      metaTone: 'muted',
      progress: { completedCount: 0, totalCount: 1, isDone: false },
    })
  })
})
