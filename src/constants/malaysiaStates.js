export const MALAYSIA_STATE_OPTIONS = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
]

const PROFILE_STATE_ALIASES = {
  'kuala lumpur': 'W.P. Kuala Lumpur',
  labuan: 'W.P. Labuan',
  putrajaya: 'W.P. Putrajaya',
}

export const normalizeMalaysiaStateForProfileRequest = (rawState) => {
  if (rawState === null || rawState === undefined) return null

  const state = String(rawState).trim()
  if (state === '') return ''
  return PROFILE_STATE_ALIASES[state.toLowerCase()] || state
}
