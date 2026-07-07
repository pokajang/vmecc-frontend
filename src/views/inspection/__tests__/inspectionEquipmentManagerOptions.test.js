import { describe, expect, it } from 'vitest'
import { buildEquipmentManagerOptions } from '../form/inspectionEquipmentManagerOptions'

describe('buildEquipmentManagerOptions', () => {
  it('builds editable equipment options from catalog rows', () => {
    const options = buildEquipmentManagerOptions({
      equipmentRows: [
        {
          equipmentId: 'eq-1',
          equipment: 'Fire Jacket',
          equipmentDescription: 'Store set',
          canEdit: true,
          canDelete: true,
        },
      ],
    })

    expect(options).toEqual([
      expect.objectContaining({
        equipmentId: 'eq-1',
        value: 'eq-1',
        title: 'Fire Jacket',
        description: 'Store set',
        canEdit: true,
        canDelete: true,
      }),
    ])
  })

  it('falls back to visible summary rows for local or injected equipment', () => {
    const options = buildEquipmentManagerOptions({
      summaryRows: [
        {
          id: 'local-radio-tetra',
          equipment: 'Radio Tetra',
          equipmentDescription: 'Office set',
        },
      ],
    })

    expect(options).toEqual([
      expect.objectContaining({
        id: 'local-radio-tetra',
        equipmentId: '',
        value: 'local-radio-tetra',
        title: 'Radio Tetra',
        description: 'Office set',
        canEdit: true,
        canDelete: true,
      }),
    ])
  })

  it('merges catalog and summary rows without duplicate equipment entries', () => {
    const options = buildEquipmentManagerOptions({
      equipmentRows: [
        {
          equipmentId: 'eq-1',
          equipment: 'Fire Jacket',
        },
      ],
      summaryRows: [
        {
          equipmentId: 'eq-1',
          equipment: 'Fire Jacket',
        },
        {
          id: 'local-fire-pant',
          equipment: 'Fire Pant',
        },
      ],
    })

    expect(options.map((option) => option.title)).toEqual(['Fire Jacket', 'Fire Pant'])
  })

  it('keeps explicit read-only seeded equipment locked', () => {
    const options = buildEquipmentManagerOptions({
      equipmentRows: [
        {
          id: 'seed-pump',
          equipment: 'Seeded Pump',
          equipmentSource: 'seed',
          canEdit: false,
          canDelete: false,
        },
      ],
    })

    expect(options[0]).toEqual(
      expect.objectContaining({
        canEdit: false,
        canDelete: false,
        readOnlyReason: 'Seeded equipment managed by report managers.',
      }),
    )
  })
})
