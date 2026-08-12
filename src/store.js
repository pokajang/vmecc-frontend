import { legacy_createStore as createStore } from 'redux'

const readStoredAiHelperOpen = () => {
  try {
    return localStorage.getItem('vmecc_ai_helper_open') === '1'
  } catch {
    return false
  }
}

const storedAiHelperOpen = readStoredAiHelperOpen()

const initialState = {
  sidebarShow: !storedAiHelperOpen,
  aiHelperOpen: storedAiHelperOpen,
  theme: 'light',
  authStatus: 'unknown',
  authUser: null,
  authError: null,
  moduleActivation: {
    hydrated: false,
    registry: [],
    configured: {},
    effective: {},
    fallbackMode: true,
  },
  systemMaintenance: {
    enabled: false,
    phase: 'off',
    graceEndsAt: null,
    message: 'System is under maintenance. Please try again later.',
    updatedAt: '',
  },
  systemMaintenanceHydrated: false,
  systemMaintenanceLoadError: null,
}

const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    default:
      return state
  }
}

const store = createStore(changeState)
export default store
