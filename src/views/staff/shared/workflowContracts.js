/**
 * @typedef {Object} WorkflowActionCapability
 * @property {string} key
 * @property {string} label
 * @property {boolean} enabled
 * @property {string} blockedReason
 */

/**
 * @typedef {Object} WorkflowStateSummary
 * @property {string} status
 * @property {string} owner
 * @property {string} nextAction
 */

/**
 * @typedef {Object} WorkflowTimelineEntry
 * @property {string} action
 * @property {string} by
 * @property {string} at
 * @property {string} remarks
 */

/**
 * @typedef {Object} UnsavedChangesGuardConfig
 * @property {boolean} enabled
 * @property {string} message
 * @property {string[]} dirtySources
 */

export const toWorkflowActionCapability = ({
  key = '',
  label = '',
  disabled = false,
  disabledReason = '',
} = {}) => ({
  key: String(key || ''),
  label: String(label || ''),
  enabled: !Boolean(disabled),
  blockedReason: disabled ? String(disabledReason || '').trim() : '',
})

export const toWorkflowStateSummary = ({ status = '', owner = '', nextAction = '' } = {}) => ({
  status: String(status || '').trim(),
  owner: String(owner || '').trim(),
  nextAction: String(nextAction || '').trim(),
})

export const toWorkflowTimelineEntry = (entry = {}) => ({
  action: String(entry?.action || '').trim(),
  by: String(entry?.by || '').trim(),
  at: String(entry?.at || '').trim(),
  remarks: String(entry?.remarks || '').trim(),
})

export const createUnsavedChangesGuardConfig = ({
  enabled = false,
  message = '',
  dirtySources = [],
} = {}) => ({
  enabled: Boolean(enabled),
  message: String(message || '').trim(),
  dirtySources: Array.isArray(dirtySources) ? dirtySources.map((source) => String(source)) : [],
})
