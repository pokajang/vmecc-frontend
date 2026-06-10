import { loadAllRecordsForInspection, saveAllRecordsForInspection } from './inspectionStorage'

export const defaultInspectionForm = {
  findings: [],
  selectedLocation: '',
}

export const isInspectionDirty = (form) => Array.isArray(form.findings) && form.findings.length > 0

export const computeDominantType = (findings) => {
  if (!Array.isArray(findings) || findings.length === 0) return ''
  const counts = {}
  findings.forEach((f) => {
    const t = String(f?.confirmedType || '').trim()
    if (t) counts[t] = (counts[t] || 0) + 1
  })
  const entries = Object.entries(counts)
  if (entries.length === 0) return ''
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

export const computeDominantLocation = (findings) => {
  if (!Array.isArray(findings)) return ''
  for (const f of findings) {
    const loc = String(
      f?.confirmedLocation ||
        (Array.isArray(f?.confirmedLocations) ? f.confirmedLocations[0] : '') ||
        f?.location ||
        '',
    ).trim()
    if (loc) return loc
  }
  return ''
}

const normalizeInspectionFinding = (finding, photosById) => {
  if (!finding || typeof finding !== 'object') return null

  const confirmedLocation = String(
    finding.confirmedLocation ||
      (Array.isArray(finding.confirmedLocations) ? finding.confirmedLocations[0] : '') ||
      finding.location ||
      '',
  ).trim()

  const confirmedType = String(finding.confirmedType || finding.type || '').trim()
  const selectedDescription = String(
    finding.selectedDescription || finding.description || '',
  ).trim()

  const photo =
    finding.photo && typeof finding.photo === 'object'
      ? finding.photo
      : photosById[String(finding.photoId || '')] || null

  return {
    ...finding,
    confirmedType,
    confirmedLocation,
    selectedDescription,
    photo,
  }
}

export const normalizeInspectionDraft = (draft) => {
  const source = draft && typeof draft === 'object' ? draft : {}
  const photos = Array.isArray(source.photos) ? source.photos.filter(Boolean) : []
  const photosById = photos.reduce((acc, photo) => {
    const key = String(photo?.id || '').trim()
    if (key) acc[key] = photo
    return acc
  }, {})

  const findings = Array.isArray(source.findings)
    ? source.findings
        .map((finding) => normalizeInspectionFinding(finding, photosById))
        .filter(Boolean)
    : []

  const selectedLocation = String(
    source.selectedLocation || computeDominantLocation(findings) || source.location || '',
  ).trim()

  return {
    ...source,
    findings,
    selectedLocation,
  }
}

export const normalizeInspectionRecord = (record) => {
  if (!record || typeof record !== 'object') return null
  return {
    id: String(record.id || ''),
    displayId: String(record.displayId || ''),
    reportType: String(record.reportType || 'inspection'),
    status: String(record.status || 'Submitted'),
    incidentType: String(record.incidentType || '').trim(),
    location: String(record.location || '').trim(),
    description: String(record.description || '').trim(),
    photos: Array.isArray(record.photos) ? record.photos.filter(Boolean) : [],
    findings: Array.isArray(record.findings) ? record.findings : [],
    submittedAt: String(record.submittedAt || ''),
    submittedBy: String(record.submittedBy || ''),
  }
}

export const migrateInspectionRecords = (userId) => {
  if (!userId) return
  const records = loadAllRecordsForInspection(userId)
  const inspectionRecords = records.filter((r) => String(r?.reportType || '') === 'inspection')
  if (inspectionRecords.length === 0) return

  const needsMigration = inspectionRecords.some(
    (r) =>
      r.weather !== undefined ||
      r.chronology !== undefined ||
      r.respondingTeamName !== undefined ||
      r.details !== undefined ||
      (Array.isArray(r.findings) &&
        r.findings.some((finding) => Array.isArray(finding?.confirmedLocations))),
  )
  if (!needsMigration) return

  const migrated = records.map((r) => {
    if (String(r?.reportType || '') !== 'inspection') return r
    const next = { ...r }
    if (next.details !== undefined && !next.description) {
      next.description = String(next.details || '').trim()
    }
    if (next.evidenceFiles !== undefined && !Array.isArray(next.photos)) {
      next.photos = Array.isArray(next.evidenceFiles) ? next.evidenceFiles : []
    }
    if (Array.isArray(next.findings)) {
      next.findings = next.findings.map((finding) => {
        if (!finding || typeof finding !== 'object') return finding
        const normalizedLocation = String(
          finding.confirmedLocation ||
            (Array.isArray(finding.confirmedLocations) ? finding.confirmedLocations[0] : '') ||
            finding.location ||
            '',
        ).trim()
        const updated = { ...finding }
        if (normalizedLocation && !updated.location) updated.location = normalizedLocation
        if (normalizedLocation && !updated.confirmedLocation) {
          updated.confirmedLocation = normalizedLocation
        }
        delete updated.confirmedLocations
        return updated
      })
    }
    delete next.weather
    delete next.chronology
    delete next.respondingTeamName
    delete next.respondingTeamShift
    delete next.respondingAttendance
    delete next.details
    delete next.detailsSource
    delete next.checklistAnswers
    delete next.actionRequired
    delete next.actionDetails
    delete next.summary
    delete next.sc
    delete next.asc
    delete next.evidenceFiles
    delete next.incidentDate
    delete next.incidentTime
    delete next.initialIncidentTime
    return next
  })
  saveAllRecordsForInspection(userId, migrated)
}
