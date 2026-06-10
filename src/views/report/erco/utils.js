import { uid } from '../utils'

const getCurrentTimeValue = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export const defaultErcoForm = () => {
  const currentTime = getCurrentTimeValue()
  return {
    initialIncidentTime: currentTime,
    incidentDate: '',
    incidentTime: currentTime,
    weather: '',
    incidentType: '',
    location: [],
    details: '',
    detailsSource: 'manual',
    summary: '',
    sc: '',
    asc: '',
    respondingTeamName: '',
    respondingTeamShift: '',
    respondingAttendance: [],
    chronology: [{ id: uid(), time: '', action: '' }],
    postIncidentAnalysis: defaultPostIncidentAnalysis(),
  }
}

export const defaultPostIncidentAnalysis = () => ({
  strengths: [''],
  resourcesMobilised: [''],
  improvementOpportunities: [''],
  photos: [],
  signOffs: {
    preparedBy: { name: '', role: '', date: '', signatureUrl: '' },
    reviewedBy: { name: '', role: '', date: '', signatureUrl: '' },
    valeReviewBy: { name: '', role: '', date: '', signatureUrl: '' },
  },
})

export const normalizeErcoLocationList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  const text = String(value || '').trim()
  if (!text) return []
  return text
    .split('|')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

export const formatErcoLocation = (value) => normalizeErcoLocationList(value).join(' | ')

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const resolveRespondingTeamLabel = (respondingTeamName, respondingAttendance) => {
  const selectedRows = (Array.isArray(respondingAttendance) ? respondingAttendance : []).filter(
    (row) => Boolean(row?.present),
  )
  if (selectedRows.length === 0) return String(respondingTeamName || '').trim() || 'Not assigned'

  const grouped = new Map()
  selectedRows.forEach((row) => {
    const teamName = String(row?.teamName || '').trim() || 'Unassigned Team'
    const key = normalizeText(teamName)
    if (!grouped.has(key)) grouped.set(key, { teamName, count: 0 })
    grouped.get(key).count += 1
  })

  const groups = Array.from(grouped.values())
  if (groups.length === 1) return groups[0].teamName

  groups.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count
    return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base', numeric: true })
  })

  const lead = groups[0]?.teamName || 'Unassigned Team'
  const supportTeams = groups
    .slice(1)
    .map((group) => group.teamName)
    .filter(Boolean)
  if (supportTeams.length === 0) return lead
  return `${lead} (Lead), supported by ${supportTeams.join(', ')}`
}

export const isErcoDirty = (form) => {
  const d = defaultErcoForm()
  const baselineIncidentTime = String(
    form?.initialIncidentTime || form?.initialReportTime || d.incidentTime || '',
  )
  if (
    form.incidentDate !== d.incidentDate ||
    String(form.incidentTime || '') !== baselineIncidentTime ||
    form.weather !== d.weather
  )
    return true
  if (
    form.incidentType !== d.incidentType ||
    Boolean(formatErcoLocation(form.location)) ||
    Boolean(form.details.trim())
  )
    return true
  if (form.summary.trim()) return true
  if (Array.isArray(form.respondingAttendance) && form.respondingAttendance.some((x) => x?.present))
    return true
  if (form.chronology.some((x) => x.time || x.action.trim())) return true

  const analysis = form?.postIncidentAnalysis || {}
  const hasAnalysisListValue = (rows) =>
    (Array.isArray(rows) ? rows : []).some((row) => String(row || '').trim())
  if (
    hasAnalysisListValue(analysis?.strengths) ||
    hasAnalysisListValue(analysis?.resourcesMobilised) ||
    hasAnalysisListValue(analysis?.improvementOpportunities)
  ) {
    return true
  }
  if (Array.isArray(analysis?.photos) && analysis.photos.length > 0) return true
  const signOffs = analysis?.signOffs || {}
  const hasSignValue = (row) =>
    Boolean(
      String(row?.name || '').trim() ||
        String(row?.role || '').trim() ||
        String(row?.date || '').trim() ||
        String(row?.signatureUrl || '').trim(),
    )
  if (
    hasSignValue(signOffs?.preparedBy) ||
    hasSignValue(signOffs?.reviewedBy) ||
    hasSignValue(signOffs?.valeReviewBy)
  ) {
    return true
  }

  return false
}
