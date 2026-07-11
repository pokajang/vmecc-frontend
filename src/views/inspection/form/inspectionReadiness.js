const countValues = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).length
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).length
  return Math.max(0, Number(value || 0) || 0)
}

export const buildInspectionReadiness = ({
  localValidationErrors = {},
  mediaProcessingCount = 0,
  unsavedPhotoDrawerCount = 0,
  pendingOperationCount = 0,
  retryableFailureCount = 0,
  permanentFailureCount = 0,
  versionConflicts = 0,
  persistenceHealth = 'healthy',
  sessionState = 'active',
} = {}) => {
  const state = {
    localValidationErrors: countValues(localValidationErrors),
    mediaProcessingCount: countValues(mediaProcessingCount),
    unsavedPhotoDrawerCount: countValues(unsavedPhotoDrawerCount),
    pendingOperationCount: countValues(pendingOperationCount),
    retryableFailureCount: countValues(retryableFailureCount),
    permanentFailureCount: countValues(permanentFailureCount),
    versionConflicts: countValues(versionConflicts),
    persistenceHealth: String(persistenceHealth || 'unknown'),
    sessionState: String(sessionState || 'unknown'),
  }

  const blockers = []
  if (state.localValidationErrors > 0) {
    blockers.push({ key: 'local-validation', message: 'Complete the required inspection details.' })
  }
  if (state.mediaProcessingCount > 0) {
    blockers.push({ key: 'media-processing', message: 'Wait for the current photo to finish.' })
  }
  if (state.unsavedPhotoDrawerCount > 0) {
    blockers.push({ key: 'unsaved-photo-drawer', message: 'Save or discard the open photo edits.' })
  }
  if (state.pendingOperationCount > 0) {
    blockers.push({ key: 'pending-operations', message: 'Inspection changes are still syncing.' })
  }
  if (state.permanentFailureCount > 0) {
    blockers.push({ key: 'permanent-sync-failure', message: 'A saved item needs correction.' })
  }
  if (state.versionConflicts > 0) {
    blockers.push({ key: 'version-conflict', message: 'Resolve the saved draft conflict.' })
  }
  if (state.persistenceHealth !== 'healthy') {
    blockers.push({
      key: 'persistence-unavailable',
      message: 'This device could not safely save the latest changes.',
    })
  }
  if (
    ['closed', 'submitted', 'conflict', 'initializing', 'unavailable'].includes(state.sessionState)
  ) {
    blockers.push({
      key: 'session-state',
      message:
        state.sessionState === 'initializing'
          ? 'Wait for the inspection session to finish loading.'
          : state.sessionState === 'unavailable'
            ? 'The inspection session could not be opened. Check your team assignment and retry.'
            : 'This inspection session cannot accept this submission.',
    })
  }

  const reviewBlockingKeys = new Set([
    'local-validation',
    'media-processing',
    'unsaved-photo-drawer',
    'version-conflict',
    'persistence-unavailable',
    'permanent-sync-failure',
    'session-state',
  ])
  return {
    ...state,
    blockers,
    isReadyToReview: blockers.every((blocker) => !reviewBlockingKeys.has(blocker.key)),
    isReadyToSubmit: blockers.length === 0,
  }
}

export const buildInspectionReadinessFromBlockers = (blockers = []) => {
  const rows = Array.isArray(blockers) ? blockers : []
  const count = (keys) => rows.filter((row) => keys.includes(row?.key)).length
  const retryCount = (keys) =>
    rows
      .filter((row) => keys.includes(row?.key))
      .reduce((total, row) => total + Math.max(1, Number(row?.retryCount || 0) || 0), 0)
  const operationalKeys = new Set([
    'draft-sync-pending',
    'fire-extinguisher-session-sync',
    'draft-sync-failed',
    'permanent-sync-failure',
    'draft-version-conflict',
  ])
  return buildInspectionReadiness({
    localValidationErrors: rows.filter(
      (row) => row?.nonBlocking !== true && !operationalKeys.has(row?.key),
    ).length,
    pendingOperationCount: retryCount(['draft-sync-pending', 'fire-extinguisher-session-sync']),
    retryableFailureCount: retryCount(['draft-sync-failed']),
    permanentFailureCount: count(['permanent-sync-failure']),
    versionConflicts: count(['draft-version-conflict']),
  })
}
