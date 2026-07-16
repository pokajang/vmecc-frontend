const ACTION_ORDER = ['view', 'download', 'edit', 'review', 'approve', 'reject', 'delete', 'back']

const ACTION_PRESENTATION = {
  view: { label: 'View details', color: 'light' },
  download: { label: 'Download report', color: 'secondary', variant: 'outline' },
  edit: { label: 'Edit', color: 'primary', variant: 'outline' },
  review: { label: 'Review', color: 'primary' },
  approve: { label: 'Approve', color: 'success' },
  reject: { label: 'Reject', color: 'danger', variant: 'outline', className: 'text-danger' },
  delete: { label: 'Delete', color: 'danger', variant: 'outline', className: 'text-danger' },
  back: { label: 'Back to records', color: 'light' },
}

const asBoolean = (value, record) =>
  typeof value === 'function' ? Boolean(value(record)) : Boolean(value)

export const getRecordActionContract = (record) => {
  const version = Number(record?.recordActionsVersion ?? record?.record_actions_version ?? 0)
  const actions = record?.recordActions ?? record?.record_actions
  return version >= 1 && actions && typeof actions === 'object' && !Array.isArray(actions)
    ? actions
    : null
}

export const getRecordActionCapability = (record, key) => {
  const capability = getRecordActionContract(record)?.[key]
  if (!capability || typeof capability !== 'object' || Array.isArray(capability)) return null
  return {
    ...capability,
    applicable: capability.applicable === true,
    allowed: capability.allowed === true,
    reasonCode: capability.reasonCode ?? capability.reason_code ?? null,
  }
}

export const isRecordActionAllowed = (record, key, fallback = false) => {
  const contract = getRecordActionContract(record)
  if (!contract) return asBoolean(fallback, record)
  const capability = getRecordActionCapability(record, key)
  return capability?.applicable === true && capability?.allowed === true
}

const fallbackDownloadAllowed = (record, fallback) => {
  if (fallback !== undefined) return asBoolean(fallback, record)
  const reportType = String(record?.reportType || '')
    .trim()
    .toLowerCase()
  if (reportType === 'fitness-test') return true
  return record?.canDownloadPdf === true
}

const actionAllowed = (record, key, fallbackCapabilities) => {
  if (key === 'back') return true
  const contract = getRecordActionContract(record)
  if (contract) {
    const capability = getRecordActionCapability(record, key)
    return Boolean(capability?.applicable && capability?.allowed)
  }
  if (key === 'view') return true
  if (key === 'download') return fallbackDownloadAllowed(record, fallbackCapabilities?.download)
  return asBoolean(fallbackCapabilities?.[key], record)
}

const getDownloadPresentation = (record, isDownloading) => {
  const format = String(getRecordActionCapability(record, 'download')?.format || '').toLowerCase()
  const reportType = String(record?.reportType || '')
    .trim()
    .toLowerCase()
  const isJson = format === 'json' || (!format && reportType === 'fitness-test')
  if (isDownloading) return { label: isJson ? 'Exporting...' : 'Downloading...', loading: true }
  return isJson ? { label: 'Export data (.json)' } : { label: 'Download report' }
}

export const resolveRecordActions = ({
  record,
  handlers = {},
  fallbackCapabilities = {},
  downloadingId = null,
  isActionBusy = false,
  isDeleting = false,
  testAnchorPrefix = '',
} = {}) => {
  if (!record) return []

  const prefix = String(testAnchorPrefix || '').trim()
  return ACTION_ORDER.flatMap((key) => {
    const handler = handlers[key]
    if (typeof handler !== 'function' || !actionAllowed(record, key, fallbackCapabilities))
      return []

    const isDownloading = key === 'download' && downloadingId === record.id
    const isBusy =
      (['review', 'approve', 'reject'].includes(key) && isActionBusy) ||
      (key === 'download' && Boolean(downloadingId)) ||
      (key === 'delete' && isDeleting)
    const downloadPresentation =
      key === 'download' ? getDownloadPresentation(record, isDownloading) : null
    const presentation = ACTION_PRESENTATION[key]

    return [
      {
        key,
        ...presentation,
        ...downloadPresentation,
        disabled: isBusy,
        disabledReason: isBusy ? 'Another action is currently in progress.' : undefined,
        testId: prefix ? `${prefix}-${key}-action` : '',
        onClick: () => handler(record),
      },
    ]
  })
}

export const getPrimaryRecordActionKeys = (actions = []) => {
  const keys = new Set(actions.map((action) => action.key))
  if (keys.has('review')) return ['review']
  if (keys.has('approve')) return ['approve']
  if (keys.has('edit')) return ['edit']
  return []
}

export { ACTION_ORDER }
