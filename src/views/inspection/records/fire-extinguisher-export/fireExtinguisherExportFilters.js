const ALL = 'all'

const valueOrEmpty = (value) => {
  const normalized = String(value ?? '').trim()
  return normalized === ALL ? '' : normalized
}

export const getInitialFireExtinguisherExportCategories = (snapshot = {}) => {
  const categories = []
  if (snapshot.issueFilter === 'with-issues' || snapshot.statusFilter === 'issues') {
    categories.push('issues')
  }
  if (snapshot.certificationFilter === 'expired') {
    categories.push('expired')
  }
  return categories
}

export const buildFireExtinguisherExportFilters = (snapshot = {}) => ({
  search: String(snapshot.search || '').trim(),
  period: String(snapshot.period || ALL),
  periodFrom: snapshot.period === 'custom' ? String(snapshot.periodFrom || '') : '',
  periodTo: snapshot.period === 'custom' ? String(snapshot.periodTo || '') : '',
  zone: valueOrEmpty(snapshot.zoneFilter),
  location: valueOrEmpty(snapshot.locationFilter),
  inspectedBy: valueOrEmpty(snapshot.inspectedByFilter) || ALL,
  status:
    snapshot.statusFilter && snapshot.statusFilter !== 'issues'
      ? String(snapshot.statusFilter)
      : ALL,
  duplicateScope: String(snapshot.duplicateScope || ALL),
})

export const hasFireExtinguisherExportFilterContext = (snapshot = {}) => {
  const filters = buildFireExtinguisherExportFilters(snapshot)
  return Boolean(
    filters.search ||
      filters.period !== ALL ||
      filters.zone ||
      filters.location ||
      filters.inspectedBy !== ALL ||
      filters.status !== ALL ||
      filters.duplicateScope !== ALL ||
      (snapshot.issueFilter && snapshot.issueFilter !== ALL) ||
      (snapshot.certificationFilter && snapshot.certificationFilter !== ALL),
  )
}

export const getFireExtinguisherExportFilterNotes = (snapshot = {}) => {
  const notes = []
  if (snapshot.issueFilter === 'no-issues') {
    notes.push('The table’s “No issues” filter is replaced by the exception choices below.')
  }
  if (['valid', 'expiring'].includes(snapshot.certificationFilter)) {
    notes.push(
      'The table’s certification filter is replaced because this export includes expired certification only.',
    )
  }
  return notes
}
