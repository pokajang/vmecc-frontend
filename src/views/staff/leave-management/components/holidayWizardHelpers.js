import { buildDefaultFixedNationalDraft } from '../data'

export const MALAYSIA_STATE_OPTIONS = [
  { value: 'All States', label: 'All States' },
  { value: 'Johor', label: 'Johor' },
  { value: 'Kedah', label: 'Kedah' },
  { value: 'Kelantan', label: 'Kelantan' },
  { value: 'Melaka', label: 'Melaka' },
  { value: 'Negeri Sembilan', label: 'Negeri Sembilan' },
  { value: 'Pahang', label: 'Pahang' },
  { value: 'Perak', label: 'Perak' },
  { value: 'Perlis', label: 'Perlis' },
  { value: 'Pulau Pinang', label: 'Pulau Pinang' },
  { value: 'Sabah', label: 'Sabah' },
  { value: 'Sarawak', label: 'Sarawak' },
  { value: 'Selangor', label: 'Selangor' },
  { value: 'Terengganu', label: 'Terengganu' },
  { value: 'Kuala Lumpur', label: 'Kuala Lumpur' },
  { value: 'Labuan', label: 'Labuan' },
  { value: 'Putrajaya', label: 'Putrajaya' },
]

export const validateNationalDefaults = (rows) => {
  const normalizedRows = Array.isArray(rows) ? rows : []
  if (normalizedRows.length === 0) return 'No default national holidays configured.'

  const selectedRows = normalizedRows.filter((row) => Boolean(row?.applicable))
  if (selectedRows.length === 0) return 'Select at least one applicable national holiday.'

  const missingDate = selectedRows.find((row) => !String(row?.date || '').trim())
  if (missingDate) return 'All default national holiday dates are required.'

  const seen = new Set()
  for (const row of selectedRows) {
    const value = String(row?.date || '').trim()
    if (seen.has(value)) return 'Default national holiday dates cannot be duplicated.'
    seen.add(value)
  }

  return null
}

const mergeSavedNationalDefaults = (baseRows, savedRows = []) => {
  const savedByKey = new Map(
    (Array.isArray(savedRows) ? savedRows : [])
      .filter((row) => row && row.fixedHolidayKey)
      .map((row) => [String(row.fixedHolidayKey), row]),
  )

  return baseRows.map((row) => {
    const saved = savedByKey.get(String(row.key))
    if (!saved) return row
    return {
      ...row,
      date: String(saved.date || row.date),
      applicable: true,
    }
  })
}

export const createInitialWizardState = (
  year = new Date().getFullYear(),
  savedNationalDefaults = [],
) => ({
  step: 'default-national',
  defaultNationalDraft: mergeSavedNationalDefaults(
    buildDefaultFixedNationalDraft(year),
    savedNationalDefaults,
  ),
  additionalDraft: {
    name: '',
    date: '',
    scope: 'National',
    state: 'All States',
  },
  pendingAdditionalRows: [],
  editingAdditionalId: null,
  isAdditionalFormVisible: false,
  stepError: null,
})

export const holidayWizardReducer = (state, action) => {
  switch (action.type) {
    case 'RESET':
      return createInitialWizardState(action.year, action.savedNationalDefaults)
    case 'SET_NATIONAL_DATE':
      return {
        ...state,
        stepError: null,
        defaultNationalDraft: state.defaultNationalDraft.map((row) =>
          row.key === action.key ? { ...row, date: action.date } : row,
        ),
      }
    case 'TOGGLE_NATIONAL_APPLICABLE':
      return {
        ...state,
        stepError: null,
        defaultNationalDraft: state.defaultNationalDraft.map((row) =>
          row.key === action.key ? { ...row, applicable: Boolean(action.applicable) } : row,
        ),
      }
    case 'UPDATE_ADDITIONAL_FIELD': {
      const nextDraft = { ...state.additionalDraft, [action.field]: action.value }
      if (action.field === 'scope' && action.value === 'National') {
        nextDraft.state = 'All States'
      }
      return {
        ...state,
        stepError: null,
        additionalDraft: nextDraft,
      }
    }
    case 'PROCEED_STEP':
      return { ...state, step: 'additional', isAdditionalFormVisible: false, stepError: null }
    case 'PROCEED_TO_SUMMARY':
      return { ...state, step: 'summary', stepError: null }
    case 'BACK_STEP':
      return { ...state, step: 'default-national', isAdditionalFormVisible: false, stepError: null }
    case 'BACK_TO_ADDITIONAL':
      return { ...state, step: 'additional', stepError: null }
    case 'OPEN_ADDITIONAL_FORM':
      return { ...state, isAdditionalFormVisible: true, stepError: null }
    case 'CLOSE_ADDITIONAL_FORM':
      return {
        ...state,
        isAdditionalFormVisible: false,
        editingAdditionalId: null,
        additionalDraft: {
          name: '',
          date: '',
          scope: 'National',
          state: 'All States',
        },
        stepError: null,
      }
    case 'SET_STEP_ERROR':
      return { ...state, stepError: action.error || null }
    case 'STAGE_ADDITIONAL': {
      const row = action.row
      if (!row) return state
      if (state.editingAdditionalId) {
        return {
          ...state,
          stepError: null,
          pendingAdditionalRows: state.pendingAdditionalRows.map((item) =>
            item.id === state.editingAdditionalId ? { ...item, ...row } : item,
          ),
          editingAdditionalId: null,
          additionalDraft: {
            name: '',
            date: '',
            scope: 'National',
            state: 'All States',
          },
          isAdditionalFormVisible: false,
        }
      }

      return {
        ...state,
        stepError: null,
        pendingAdditionalRows: [
          ...state.pendingAdditionalRows,
          {
            ...row,
            id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          },
        ],
        additionalDraft: {
          name: '',
          date: '',
          scope: 'National',
          state: 'All States',
        },
        isAdditionalFormVisible: false,
      }
    }
    case 'EDIT_ADDITIONAL': {
      const row = state.pendingAdditionalRows.find((item) => item.id === action.id)
      if (!row) return state
      return {
        ...state,
        stepError: null,
        editingAdditionalId: action.id,
        additionalDraft: {
          name: row.name || '',
          date: row.date || '',
          scope: row.scope || 'National',
          state: row.state || 'All States',
        },
        isAdditionalFormVisible: true,
      }
    }
    case 'REMOVE_ADDITIONAL': {
      const remaining = state.pendingAdditionalRows.filter((item) => item.id !== action.id)
      return {
        ...state,
        stepError: null,
        pendingAdditionalRows: remaining,
        editingAdditionalId:
          state.editingAdditionalId === action.id ? null : state.editingAdditionalId,
      }
    }
    default:
      return state
  }
}
