import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getInspectionTourLaunchEligibility,
  getTrtInspectionTourEligibility,
  getTrtInspectionTourStorageKey,
  isTrtInspectionTourSuppressed,
  readTrtInspectionTourRecord,
  writeTrtInspectionTourRecord,
} from '../trtInspectionTour'

const createStorageMock = () => {
  let values = {}
  return {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    ),
    setItem: vi.fn((key, value) => {
      values[key] = String(value)
    }),
    clear: vi.fn(() => {
      values = {}
    }),
  }
}

const completeTrtUser = {
  id: 12,
  name: 'TRT Member',
  ic_number: '900101-01-1234',
  phone: '012 3456 789',
  address: 'Lot 1',
  state: 'Selangor',
  roles: ['Tactical Response Team'],
  permissions: ['reports.inspection.view'],
  emergency_contact: {
    name: 'Emergency Person',
    relationship: 'Sibling',
    phone: '013 3456 789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('trtInspectionTour', () => {
  it('marks complete TRT users with inspection permission as eligible', () => {
    expect(getTrtInspectionTourEligibility(completeTrtUser)).toMatchObject({
      applies: true,
      canViewInspection: true,
      profileComplete: true,
      eligible: true,
    })
  })

  it('allows manual Inspection launch for any user with inspection permission', () => {
    expect(
      getInspectionTourLaunchEligibility({
        ...completeTrtUser,
        roles: ['Admin'],
        phone: '',
      }),
    ).toMatchObject({
      canViewInspection: true,
      eligible: true,
    })
  })

  it('does not apply to non-TRT users', () => {
    expect(getTrtInspectionTourEligibility({ ...completeTrtUser, roles: ['Admin'] })).toMatchObject(
      {
        applies: false,
        eligible: false,
      },
    )
  })

  it('does not apply to incomplete TRT profiles', () => {
    expect(getTrtInspectionTourEligibility({ ...completeTrtUser, phone: '' })).toMatchObject({
      profileComplete: false,
      eligible: false,
    })
  })

  it('does not apply without inspection permission', () => {
    expect(getTrtInspectionTourEligibility({ ...completeTrtUser, permissions: [] })).toMatchObject({
      canViewInspection: false,
      eligible: false,
    })
  })

  it('stores user-scoped tour records and suppresses completed or dismissed tours', () => {
    writeTrtInspectionTourRecord(completeTrtUser.id, { completedAt: '2026-06-24T00:00:00.000Z' })

    expect(getTrtInspectionTourStorageKey(completeTrtUser.id)).toBe(
      'vmecc_onboarding:inspection_quick_tour_trt:v1:12',
    )
    expect(readTrtInspectionTourRecord(completeTrtUser.id).completedAt).toBeTruthy()
    expect(isTrtInspectionTourSuppressed(readTrtInspectionTourRecord(completeTrtUser.id))).toBe(
      true,
    )
    expect(isTrtInspectionTourSuppressed({ dismissedAt: '2026-06-24T00:00:00.000Z' })).toBe(true)
    expect(isTrtInspectionTourSuppressed({ lastStartedAt: '2026-06-24T00:00:00.000Z' })).toBe(false)
  })
})
