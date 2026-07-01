// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useDrillLocationManager from '../useDrillLocationManager'
import useDrillTypeManager from '../useDrillTypeManager'

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
