import { describe, expect, it } from 'vitest'
import {
  getProfileCompleteness,
  hasCriticalMedicalInfoAcknowledgement,
  isTacticalResponseTeamMember,
} from '../trtProfileCompletion'

const completeTrtUser = {
  id: 1,
  name: 'TRT Member',
  ic_number: '900101-01-1234',
  phone: '012 3456 789',
  address: 'Lot 1',
  state: 'Selangor',
  roles: ['Tactical Response Team'],
  emergency_contact: {
    name: 'Emergency Person',
    relationship: 'Sibling',
    phone: '013 3456 789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

describe('trtProfileCompletion', () => {
  it('detects Tactical Response Team users', () => {
    expect(isTacticalResponseTeamMember(completeTrtUser)).toBe(true)
    expect(isTacticalResponseTeamMember({ roles: ['Admin'] })).toBe(false)
  })

  it('returns complete for a TRT user with operational essentials', () => {
    const result = getProfileCompleteness(completeTrtUser)

    expect(result.applies).toBe(true)
    expect(result.complete).toBe(true)
    expect(result.missingGroups).toEqual([])
  })

  it('returns missing field groups for an incomplete TRT user', () => {
    const result = getProfileCompleteness({
      ...completeTrtUser,
      phone: '',
      state: '',
      emergency_contact: { name: '', relationship: 'Sibling', phone: '' },
      medical_info: {},
    })

    expect(result.complete).toBe(false)
    expect(result.missingGroups).toEqual(['personal', 'emergency', 'medical'])
    expect(result.missingByGroup.personal.map((field) => field.key)).toEqual(['phone', 'state'])
    expect(result.missingByGroup.emergency.map((field) => field.key)).toEqual([
      'emergency_contact.name',
      'emergency_contact.phone',
    ])
  })

  it('applies to authenticated users regardless of role', () => {
    const result = getProfileCompleteness({
      id: 2,
      roles: ['Admin'],
      name: '',
    })

    expect(result.applies).toBe(true)
    expect(result.complete).toBe(false)
    expect(result.missingGroups).toEqual(['personal', 'emergency', 'medical'])
  })

  it('does not apply without an authenticated user', () => {
    const result = getProfileCompleteness(null)

    expect(result.applies).toBe(false)
    expect(result.complete).toBe(true)
  })

  it('accepts medical details or explicit no-known-critical-info acknowledgement', () => {
    expect(hasCriticalMedicalInfoAcknowledgement({ noKnownCriticalMedicalInfo: true })).toBe(true)
    expect(hasCriticalMedicalInfoAcknowledgement({ allergies: ['penicillin'] })).toBe(true)
    expect(hasCriticalMedicalInfoAcknowledgement({ notes: 'Carry inhaler' })).toBe(true)
    expect(hasCriticalMedicalInfoAcknowledgement({ allergies: [] })).toBe(false)
  })
})
