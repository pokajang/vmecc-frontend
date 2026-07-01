import { stripInspectionContext } from 'src/views/inspection/typeOptionUtils'

export const selectedChecklistItems = (row = {}) =>
  (Array.isArray(row.checklist) ? row.checklist : []).filter(
    (item) => item && item.selected !== false && String(item.label || '').trim(),
  )

export const buildChecklistSummaryFromRows = (rows = []) => {
  const submittedRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => row?.recordKind !== 'draft' && row?.recordKind !== 'queued',
  )
  const items = new Map()
  submittedRows.forEach((row) => {
    selectedChecklistItems(row).forEach((item) => {
      const id = String(item.id || item.label || '').trim()
      const current = items.get(id) || {
        id,
        label: String(item.label || '').trim(),
        count: 0,
        lastSeenAt: null,
        inspectionTypes: [],
      }
      current.count += 1
      const seenAt = row.submittedAt || row.updatedAt || row.createdAt || row.incidentDate
      if (seenAt && (!current.lastSeenAt || new Date(seenAt) > new Date(current.lastSeenAt))) {
        current.lastSeenAt = seenAt
      }
      const type = String(row.incidentType || '').trim()
      if (type && !current.inspectionTypes.includes(type)) current.inspectionTypes.push(type)
      items.set(id, current)
    })
  })
  const withChecklist = submittedRows.filter((row) => selectedChecklistItems(row).length > 0).length
  return {
    totalReports: submittedRows.length,
    withChecklist,
    withoutChecklist: submittedRows.length - withChecklist,
    items: Array.from(items.values()).sort((a, b) => b.count - a.count),
  }
}

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

export const exportInspectionRecordsCsv = (rows = []) => {
  const header = [
    'Report ID',
    'Status',
    'Type',
    'Location',
    'Reported By',
    'Reported At',
    'Checklist Status',
    'Checklist Items',
  ]
  const body = (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.recordKind !== 'queued')
    .map((row) => {
      const checklist = selectedChecklistItems(row)
      return [
        row.displayId || row.id || '',
        row.status || '',
        stripInspectionContext(row.incidentType) || row.incidentType || '',
        row.location || '',
        row.submittedBy || row.reportedBy || row.timeline?.[0]?.by || '',
        row.submittedAt || row.incidentDate || row.createdAt || row.savedAt || '',
        checklist.length > 0 ? 'Has checklist' : 'No checklist',
        checklist.map((item) => item.label).join('; '),
      ]
    })
  const csv = [header, ...body].map((row) => row.map(csvEscape).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inspection-records-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
