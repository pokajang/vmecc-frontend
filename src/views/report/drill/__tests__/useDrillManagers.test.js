// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useDrillCategoryManager from '../useDrillCategoryManager'
import useDrillLocationManager from '../useDrillLocationManager'
import useDrillTypeManager from '../useDrillTypeManager'
import useDrillEnvironmentManager from '../useDrillEnvironmentManager'

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    dump: () => ({ ...store }),
  }
}

const storedRows = () =>
  Object.values(localStorage.dump())
    .map((value) => JSON.parse(value))
    .flat()

const renderTypeManager = (overrides = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(() =>
    useDrillTypeManager({
      userId: 'user-1',
      selectedType: '',
      updateSetupField,
      pushToast,
      ...overrides,
    }),
  )
  return { ...hook, updateSetupField, pushToast }
}

const renderLocationManager = (overrides = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(() =>
    useDrillLocationManager({
      userId: 'user-1',
      selectedLocation: '',
      updateSetupField,
      pushToast,
      ...overrides,
    }),
  )
  return { ...hook, updateSetupField, pushToast }
}

const renderCategoryManager = (overrides = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(() =>
    useDrillCategoryManager({
      userId: 'user-1',
      selectedCategories: [],
      updateSetupField,
      pushToast,
      ...overrides,
    }),
  )
  return { ...hook, updateSetupField, pushToast }
}

const renderEnvironmentManager = (overrides = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(() =>
    useDrillEnvironmentManager({
      userId: 'user-1',
      selectedEnvironment: '',
      updateSetupField,
      pushToast,
      ...overrides,
    }),
  )
  return { ...hook, updateSetupField, pushToast }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDrillTypeManager', () => {
  it('adds custom drill types with unused icons and persists them', async () => {
    const { result, updateSetupField, pushToast } = renderTypeManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newTypeIconKey).toBeTruthy())

    expect(['Flame', 'LifeBuoy', 'Activity', 'ShieldCheck']).not.toContain(
      result.current.newTypeIconKey,
    )

    act(() => {
      result.current.setNewTypeName('Confined Space Drill')
      result.current.setNewTypeDescription('Entry rescue practice.')
    })
    act(() => result.current.saveType())

    expect(updateSetupField).toHaveBeenCalledWith('incidentType', 'Confined Space Drill')
    expect(pushToast).toHaveBeenCalledWith(
      'Drill type "Confined Space Drill" added.',
      expect.objectContaining({ title: 'Type added', color: 'success' }),
    )
    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Confined Space Drill',
          title: 'Confined Space Drill',
          description: 'Entry rescue practice.',
          iconKey: expect.any(String),
        }),
      ]),
    )
  })

  it('blocks duplicate drill type names and duplicate icons', async () => {
    const { result } = renderTypeManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newTypeIconKey).toBeTruthy())
    act(() => result.current.setNewTypeName('Fire Drill'))
    act(() => result.current.saveType())
    expect(result.current.addTypeError).toBe('This drill type already exists.')

    act(() => {
      result.current.setAddTypeError('')
      result.current.setNewTypeName('Unique Drill')
      result.current.setNewTypeIconKey('Flame')
    })
    act(() => result.current.saveType())
    expect(result.current.addTypeError).toBe('This icon is already used by another type.')
  })

  it('edits and deletes selected custom drill types while preserving selected setup state', async () => {
    const { result, rerender, updateSetupField } = renderTypeManager({
      selectedType: 'Confined Space Drill',
    })

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newTypeIconKey).toBeTruthy())
    act(() => {
      result.current.setNewTypeName('Confined Space Drill')
      result.current.setNewTypeIconKey(result.current.iconOptions[0].key)
    })
    act(() => result.current.saveType())
    rerender()

    const customType = result.current.typeOptions.find(
      (row) => row.value === 'Confined Space Drill',
    )
    act(() => result.current.startEditType(customType))
    act(() => result.current.setNewTypeName('Confined Entry Drill'))
    act(() => result.current.saveType())

    expect(updateSetupField).toHaveBeenCalledWith('incidentType', 'Confined Entry Drill')
    expect(storedRows()).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Confined Entry Drill' })]),
    )

    act(() => result.current.removeType('Confined Entry Drill'))
    expect(storedRows()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Confined Entry Drill' })]),
    )
  })
})

describe('useDrillLocationManager', () => {
  it('adds custom drill locations and persists the selected value', async () => {
    const { result, updateSetupField, pushToast } = renderLocationManager()

    act(() => result.current.openAddModal())
    act(() => {
      result.current.setNewLocationName('Crusher Bay')
      result.current.setNewLocationDescription('Primary crusher zone.')
    })
    act(() => result.current.saveType())

    expect(updateSetupField).toHaveBeenCalledWith('location', 'Crusher Bay')
    expect(pushToast).toHaveBeenCalledWith(
      'Drill location "Crusher Bay" added.',
      expect.objectContaining({ title: 'Location added', color: 'success' }),
    )
    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Crusher Bay',
          title: 'Crusher Bay',
          description: 'Primary crusher zone.',
        }),
      ]),
    )
  })

  it('blocks duplicate drill locations', () => {
    const { result } = renderLocationManager()

    act(() => result.current.openAddModal())
    act(() => result.current.setNewLocationName('Workshop'))
    act(() => result.current.saveType())

    expect(result.current.addLocationError).toBe('This drill location already exists.')
  })

  it('edits and deletes selected custom drill locations', () => {
    const { result, rerender, updateSetupField } = renderLocationManager({
      selectedLocation: 'Crusher Bay',
    })

    act(() => result.current.openAddModal())
    act(() => result.current.setNewLocationName('Crusher Bay'))
    act(() => result.current.saveType())
    rerender()

    const customLocation = result.current.typeOptions.find((row) => row.value === 'Crusher Bay')
    act(() => result.current.startEditType(customLocation))
    act(() => result.current.setNewLocationName('Crusher Workshop'))
    act(() => result.current.saveType())

    expect(updateSetupField).toHaveBeenCalledWith('location', 'Crusher Workshop')
    expect(storedRows()).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Crusher Workshop' })]),
    )

    act(() => result.current.removeType('Crusher Workshop'))
    expect(storedRows()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Crusher Workshop' })]),
    )
  })
})

describe('useDrillCategoryManager', () => {
  it('adds, selects, and persists a custom exercise category', async () => {
    const { result, updateSetupField, pushToast } = renderCategoryManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newCategoryIconKey).toBeTruthy())
    act(() => {
      result.current.setNewCategoryName('Medical Response')
      result.current.setNewCategoryDescription('Casualty triage and medical handover.')
    })
    act(() => result.current.saveCategory())

    expect(updateSetupField).toHaveBeenCalledWith('exerciseCategories', ['Medical Response'])
    expect(pushToast).toHaveBeenCalledWith(
      'Exercise category "Medical Response" added.',
      expect.objectContaining({ title: 'Category added', color: 'success' }),
    )
    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Medical Response',
          description: 'Casualty triage and medical handover.',
          iconKey: expect.any(String),
        }),
      ]),
    )
  })

  it('blocks duplicate exercise categories', async () => {
    const { result } = renderCategoryManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newCategoryIconKey).toBeTruthy())
    act(() => result.current.setNewCategoryName('Fire'))
    act(() => result.current.saveCategory())

    expect(result.current.addCategoryError).toBe('This exercise category already exists.')
  })

  it('chooses an unused icon for each newly added exercise category', async () => {
    const { result } = renderCategoryManager()

    for (const name of ['Medical Response', 'Traffic Control', 'Command Support']) {
      act(() => result.current.openAddModal())
      await waitFor(() => expect(result.current.newCategoryIconKey).toBeTruthy())
      expect(result.current.iconOptions.map((option) => option.key)).toContain(
        result.current.newCategoryIconKey,
      )
      act(() => result.current.setNewCategoryName(name))
      act(() => result.current.saveCategory())
      expect(result.current.addCategoryError).toBe('')
    }

    expect(storedRows()).toHaveLength(3)
  })

  it('edits and removes a selected custom exercise category', async () => {
    const first = renderCategoryManager()
    act(() => first.result.current.openAddModal())
    await waitFor(() => expect(first.result.current.newCategoryIconKey).toBeTruthy())
    act(() => first.result.current.setNewCategoryName('Medical Response'))
    act(() => first.result.current.saveCategory())
    first.unmount()

    const edited = renderCategoryManager({
      selectedCategories: ['Fire', 'Medical Response'],
    })
    await waitFor(() =>
      expect(
        edited.result.current.categoryOptions.some((row) => row.value === 'Medical Response'),
      ).toBe(true),
    )
    const customCategory = edited.result.current.categoryOptions.find(
      (row) => row.value === 'Medical Response',
    )
    act(() => edited.result.current.startEditCategory(customCategory))
    act(() => edited.result.current.setNewCategoryName('Medical Support'))
    act(() => edited.result.current.saveCategory())
    expect(edited.updateSetupField).toHaveBeenCalledWith('exerciseCategories', [
      'Fire',
      'Medical Support',
    ])
    edited.unmount()

    const removed = renderCategoryManager({ selectedCategories: ['Fire', 'Medical Support'] })
    await waitFor(() =>
      expect(
        removed.result.current.categoryOptions.some((row) => row.value === 'Medical Support'),
      ).toBe(true),
    )
    act(() => removed.result.current.removeCategory('Medical Support'))
    expect(removed.updateSetupField).toHaveBeenLastCalledWith('exerciseCategories', ['Fire'])
    expect(storedRows()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Medical Support' })]),
    )
  })
})

describe('useDrillEnvironmentManager', () => {
  it('adds a custom environment and persists selection', async () => {
    const { result, updateSetupField, pushToast } = renderEnvironmentManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newEnvironmentIconKey).toBeTruthy())

    act(() => {
      result.current.setNewEnvironmentName('Tunnel Environment')
      result.current.setNewEnvironmentDescription('Low-light confined operations.')
    })
    act(() => result.current.saveType())

    expect(updateSetupField).toHaveBeenCalledWith('weather', 'Tunnel Environment')
    expect(pushToast).toHaveBeenCalledWith(
      'Drill environment "Tunnel Environment" added.',
      expect.objectContaining({ title: 'Environment added', color: 'success' }),
    )
    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'Tunnel Environment',
          title: 'Tunnel Environment',
          description: 'Low-light confined operations.',
          iconKey: expect.any(String),
        }),
      ]),
    )
  })

  it('blocks duplicate environment names and duplicate icons', async () => {
    const { result } = renderEnvironmentManager()

    act(() => result.current.openAddModal())
    await waitFor(() => expect(result.current.newEnvironmentIconKey).toBeTruthy())
    act(() => result.current.setNewEnvironmentName('Clear'))
    act(() => result.current.saveType())
    expect(result.current.addEnvironmentError).toBe('This drill environment already exists.')

    act(() => {
      result.current.setAddEnvironmentError('')
      result.current.setNewEnvironmentName('Tunnel Environment')
      result.current.setNewEnvironmentIconKey('Sun')
    })
    act(() => result.current.saveType())
    expect(result.current.addEnvironmentError).toBe(
      'This icon is already used by another environment.',
    )
  })

  it('edits and removes a selected custom environment while preserving selected state', async () => {
    const first = renderEnvironmentManager({ selectedEnvironment: 'Tunnel Environment' })
    act(() => first.result.current.openAddModal())
    await waitFor(() => expect(first.result.current.newEnvironmentIconKey).toBeTruthy())
    act(() => first.result.current.setNewEnvironmentName('Tunnel Environment'))
    act(() => first.result.current.setNewEnvironmentDescription('Low-light confined operations.'))
    act(() => first.result.current.saveType())
    first.unmount()

    const edited = renderEnvironmentManager({
      selectedEnvironment: 'Tunnel Environment',
    })
    await waitFor(() =>
      expect(
        edited.result.current.typeOptions.some((row) => row.value === 'Tunnel Environment'),
      ).toBe(true),
    )
    const customEnvironment = edited.result.current.typeOptions.find(
      (row) => row.value === 'Tunnel Environment',
    )
    act(() => edited.result.current.startEditType(customEnvironment))
    act(() => edited.result.current.setNewEnvironmentName('Confined Tunnel'))
    act(() => edited.result.current.saveType())
    expect(edited.updateSetupField).toHaveBeenCalledWith('weather', 'Confined Tunnel')

    act(() => edited.result.current.removeType('Confined Tunnel'))
    expect(storedRows()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Confined Tunnel' })]),
    )
  })
})
