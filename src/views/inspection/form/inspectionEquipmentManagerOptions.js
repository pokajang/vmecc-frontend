const text = (value) => String(value || '').trim()

const getBackendId = (row = {}) =>
  text(
    row.equipmentId ?? row.equipment_id ?? row.equipmentCatalogId ?? row.equipment_catalog_id ?? '',
  )

const getRowId = (row = {}, backendId = '') =>
  text(row.id || row.value || backendId || row.equipment || row.title || row.name)

const getTitle = (row = {}) => text(row.equipment || row.title || row.name || row.value)

export const buildEquipmentManagerOptions = ({ equipmentRows = [], summaryRows = [] } = {}) => {
  const sourceRows = [
    ...(Array.isArray(equipmentRows) ? equipmentRows : []),
    ...(Array.isArray(summaryRows) ? summaryRows : []),
  ]
  const seen = new Set()

  return sourceRows
    .map((row) => {
      const backendId = getBackendId(row)
      const rowId = getRowId(row, backendId)
      const title = getTitle(row)
      const value = backendId || rowId
      const description = text(row.description || row.equipmentDescription)
      const canManage = Boolean(value)
      const canEdit = row.canEdit !== false && canManage
      const canDelete = row.canDelete !== false && canManage

      return {
        ...row,
        id: rowId,
        equipmentId: backendId,
        equipment: title,
        title,
        value,
        description,
        equipmentDescription: description,
        canEdit,
        canDelete,
        readOnlyReason:
          row.readOnlyReason ||
          (row.equipmentSource === 'seed' && !canEdit && !canDelete
            ? 'Seeded equipment managed by report managers.'
            : ''),
      }
    })
    .filter((row) => {
      const dedupeKey = String(row.equipmentId || row.id || row.title || '').toLowerCase()
      if (!row.title || seen.has(dedupeKey)) return false
      seen.add(dedupeKey)
      return true
    })
}
