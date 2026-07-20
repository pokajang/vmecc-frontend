// Keep the persisted key stable so existing snooze and completion records remain valid.
export const PROFILE_COMPLETION_ONBOARDING_KEY = 'profile_completion_trt'
export const PROFILE_COMPLETION_ONBOARDING_VERSION = 'v1'
export const PROFILE_COMPLETION_ONBOARDING_STORAGE_PREFIX = `vmecc_onboarding:${PROFILE_COMPLETION_ONBOARDING_KEY}:${PROFILE_COMPLETION_ONBOARDING_VERSION}`
export const TRT_ROLE = 'Tactical Response Team'
export const PROFILE_COMPLETION_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000

// Backward-compatible aliases for existing imports while this feature transitions from TRT-only.
export const TRT_PROFILE_ONBOARDING_KEY = PROFILE_COMPLETION_ONBOARDING_KEY
export const TRT_PROFILE_ONBOARDING_VERSION = PROFILE_COMPLETION_ONBOARDING_VERSION
export const TRT_PROFILE_ONBOARDING_STORAGE_PREFIX = PROFILE_COMPLETION_ONBOARDING_STORAGE_PREFIX
export const TRT_REMINDER_DELAY_MS = PROFILE_COMPLETION_REMINDER_DELAY_MS

export const PROFILE_COMPLETION_GROUPS = [
  {
    key: 'personal',
    title: 'Personal details',
    description: 'Confirm contact details used by supervisors and duty leads.',
  },
  {
    key: 'emergency',
    title: 'Emergency contact',
    description: 'Provide a reachable contact for urgent welfare support.',
  },
  {
    key: 'medical',
    title: 'Critical medical info',
    description: 'Record known medical details or confirm there is nothing critical to declare.',
  },
]

const REQUIRED_FIELDS = {
  personal: [
    { key: 'name', label: 'Name' },
    { key: 'ic_number', label: 'IC number' },
    { key: 'phone', label: 'Mobile number' },
    { key: 'address', label: 'Home address' },
    { key: 'state', label: 'State' },
  ],
  emergency: [
    { key: 'emergency_contact.name', label: 'Emergency contact name' },
    { key: 'emergency_contact.relationship', label: 'Emergency contact relationship' },
    { key: 'emergency_contact.phone', label: 'Emergency contact mobile number' },
  ],
}

const isFilled = (value) => String(value || '').trim().length > 0

const normalizeRoles = (user) =>
  Array.isArray(user?.roles) ? user.roles.map((role) => String(role || '').trim()) : []

const getValue = (source, path) =>
  String(path || '')
    .split('.')
    .reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), source)

const hasListItems = (value) => Array.isArray(value) && value.some((item) => isFilled(item))

export const isTacticalResponseTeamMember = (user) => normalizeRoles(user).includes(TRT_ROLE)

export const hasCriticalMedicalInfoAcknowledgement = (medicalInfo) => {
  const medical = medicalInfo && typeof medicalInfo === 'object' ? medicalInfo : {}
  return (
    medical.noKnownCriticalMedicalInfo === true ||
    isFilled(medical.bloodType) ||
    isFilled(medical.notes) ||
    hasListItems(medical.allergies) ||
    hasListItems(medical.conditions) ||
    hasListItems(medical.medications)
  )
}

export const getProfileCompleteness = (user) => {
  const applies = Boolean(user?.id)
  if (!applies) {
    return {
      applies: false,
      complete: true,
      missingGroups: [],
      missingFields: [],
      missingByGroup: {},
    }
  }

  const missingByGroup = {}
  Object.entries(REQUIRED_FIELDS).forEach(([groupKey, fields]) => {
    const missing = fields.filter((field) => !isFilled(getValue(user, field.key)))
    if (missing.length > 0) {
      missingByGroup[groupKey] = missing
    }
  })

  if (!hasCriticalMedicalInfoAcknowledgement(user?.medical_info)) {
    missingByGroup.medical = [
      {
        key: 'medical_info',
        label: 'Critical medical info acknowledgement',
      },
    ]
  }

  const missingGroups = PROFILE_COMPLETION_GROUPS.filter(
    (group) => (missingByGroup[group.key] || []).length > 0,
  ).map((group) => group.key)
  const missingFields = Object.values(missingByGroup).flat()

  return {
    applies,
    complete: missingFields.length === 0,
    missingGroups,
    missingFields,
    missingByGroup,
  }
}

export const getProfileOnboardingStorageKey = (userId) =>
  `${PROFILE_COMPLETION_ONBOARDING_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const getTrtOperationalProfileCompleteness = getProfileCompleteness
export const getTrtProfileOnboardingStorageKey = getProfileOnboardingStorageKey
