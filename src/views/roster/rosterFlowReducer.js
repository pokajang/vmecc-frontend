export const initialRosterFlowState = {
  editMode: false,
  isDirty: false,
  isSavingDraft: false,
  isPublishing: false,
  statusMessage: null,
  error: null,
}

const rosterFlowReducer = (state, action) => {
  switch (action.type) {
    case 'set-edit-mode':
      return { ...state, editMode: Boolean(action.value) }
    case 'set-dirty':
      return { ...state, isDirty: Boolean(action.value) }
    case 'start-save-draft':
      return { ...state, isSavingDraft: true, error: null }
    case 'finish-save-draft':
      return { ...state, isSavingDraft: false }
    case 'start-publish':
      return { ...state, isPublishing: true, error: null }
    case 'finish-publish':
      return { ...state, isPublishing: false }
    case 'set-status-message':
      return { ...state, statusMessage: action.message || null }
    case 'set-error':
      return { ...state, error: action.message || null }
    case 'clear-feedback':
      return { ...state, statusMessage: null, error: null }
    case 'reset-edit':
      return { ...state, editMode: false, isDirty: false }
    default:
      return state
  }
}

export default rosterFlowReducer
