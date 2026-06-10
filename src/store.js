import { legacy_createStore as createStore } from 'redux'

const initialState = {
  sidebarShow: true,
  theme: 'light',
  authStatus: 'unknown',
  authUser: null,
  authError: null,
  systemMaintenance: {
    enabled: false,
    phase: 'off',
    graceEndsAt: null,
    message: 'System is under maintenance. Please try again later.',
    updatedAt: '',
  },
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
