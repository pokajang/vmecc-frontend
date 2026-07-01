// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useLocationTypeManager from '../useLocationTypeManager'

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
  Object.entries(localStorage.dump())
    .filter(([key]) => key.includes('custom_location_types'))
    .map(([, value]) => value)
    .map((value) => JSON.parse(value))
    .flat()

const renderLocationManager = (props = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(
    (hookProps) =>
      useLocationTypeManager({
        userId: 'user-1',
        inspectionType: 'Fire Extinguisher Inspection',
        mainLocation: '',
        subLocation: '',
        updateSetupField,
        pushToast,
        ...hookProps,
      }),
    { initialProps: props },
  )
  return { ...hook, updateSetupField, pushToast }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLocationTypeManager', () => {
  it('keeps the selected sub-location after saving an edit with the same name', async () => {
    const { result, updateSetupField } = renderLocationManager({
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
    })
    const reception = result.current.subLocationOptions.find((row) => row.value === 'Reception')

    act(() => result.current.startEditType(reception))
    await act(async () => result.current.saveType())

    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
    })
  })

  it('moves custom sub-locations when the selected main location is renamed', async () => {
    const { result, rerender, updateSetupField } = renderLocationManager({
      mainLocation: 'Manjung Hub',
      subLocation: 'Pump Room',
    })

    act(() => result.current.openAddSubLocationModal())
    act(() => {
      result.current.setNewLocationName('Pump Room')
      result.current.setNewLocationDescription('User-defined inspection point.')
    })
    await act(async () => result.current.saveType())

    const manjungHub = result.current.mainLocationOptions.find((row) => row.value === 'Manjung Hub')
    act(() => result.current.startEditType(manjungHub))
    act(() => result.current.setNewLocationName('Manjung Hub A'))
    await act(async () => result.current.saveType())
    rerender({ mainLocation: 'Manjung Hub A', subLocation: 'Pump Room' })

    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'sub',
          parentValue: 'Manjung Hub A',
          value: 'Pump Room',
        }),
      ]),
    )
    expect(result.current.subLocationOptions.map((row) => row.value)).toContain('Pump Room')
    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      mainLocation: 'Manjung Hub A',
      subLocation: 'Pump Room',
    })
  })
})
