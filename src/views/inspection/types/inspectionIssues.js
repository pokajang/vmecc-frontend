const text = (value) => String(value || '').trim()

const normalizeIssuePhoto = (photo = {}) => {
  if (!photo || typeof photo !== 'object') return null
  const id = text(photo.id || photo.photoId || photo.photo_id)
  const url = String(photo.url || photo.dataUrl || photo.data_url || '')
  const fileName = text(photo.fileName || photo.file_name || photo.name)
  const description = String(photo.description || photo.caption || '')
  if (!id && !url && !fileName && !description.trim()) return null
  return {
    ...photo,
    id,
    fileName,
    description,
    url,
  }
}

export const normalizeInspectionIssuePhotos = (photos = []) =>
  (Array.isArray(photos) ? photos : []).map(normalizeIssuePhoto).filter(Boolean)

export const isInspectionIssueBlank = (issue = {}) =>
  !text(issue.description || issue.details) &&
  !text(issue.actionRequired || issue.action_required) &&
  normalizeInspectionIssuePhotos(issue.photos || issue.issue_photos).length === 0

export const normalizeInspectionIssues = (source = []) =>
  (Array.isArray(source) ? source : [])
    .map((issue, index) => {
      if (!issue || typeof issue !== 'object') return null
      const id = text(issue.id || issue.issueId || issue.issue_id) || `issue-${index + 1}`
      return {
        ...issue,
        id,
        description: String(issue.description || issue.details || ''),
        actionRequired: String(issue.actionRequired || issue.action_required || ''),
        photos: normalizeInspectionIssuePhotos(issue.photos || issue.issue_photos),
        createdAt: text(issue.createdAt || issue.created_at),
        updatedAt: text(issue.updatedAt || issue.updated_at),
      }
    })
    .filter((issue) => issue && !isInspectionIssueBlank(issue))

export const normalizeInspectionIssueDrafts = (source = []) =>
  (Array.isArray(source) ? source : [])
    .map((issue, index) => {
      if (!issue || typeof issue !== 'object') return null
      const id = text(issue.id || issue.issueId || issue.issue_id) || `issue-${index + 1}`
      return {
        ...issue,
        id,
        description: String(issue.description || issue.details || ''),
        actionRequired: String(issue.actionRequired || issue.action_required || ''),
        photos: normalizeInspectionIssuePhotos(issue.photos || issue.issue_photos),
        createdAt: text(issue.createdAt || issue.created_at),
        updatedAt: text(issue.updatedAt || issue.updated_at),
      }
    })
    .filter(Boolean)

export const createInspectionIssue = () => {
  const now = new Date().toISOString()
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    actionRequired: '',
    photos: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const getInspectionIssueValidationDetails = (issues = []) => {
  const normalized = normalizeInspectionIssueDrafts(issues)
  const incompleteIssues = normalized
    .map((issue, index) => ({ issue, index }))
    .filter(({ issue }) => !isInspectionIssueBlank(issue) && !text(issue.description))

  return {
    incompleteIssues: incompleteIssues.map(({ issue, index }) => ({
      id: issue.id,
      index,
      label: `Issue ${index + 1}`,
    })),
    firstTarget:
      incompleteIssues.length > 0
        ? { field: 'inspectionIssues', issueId: incompleteIssues[0].issue.id }
        : null,
    errorCount: incompleteIssues.length,
  }
}
