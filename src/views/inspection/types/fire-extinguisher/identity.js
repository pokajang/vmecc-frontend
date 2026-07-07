const text = (value) => String(value || '').trim()

const normalizeIdentityPart = (value) =>
  text(value)
    .replace(/CO[\u00b2\ufffd]/gi, 'CO2')
    .toLowerCase()
    .replace(/\s+/g, ' ')

const normalizeZonePart = (value) =>
  normalizeIdentityPart(value)
    .replace(/^zone\s+/i, '')
    .trim()

const hashLocationIdentity = ({ zone = '', mainLocation = '', subLocation = '', idLocNo = '' }) => {
  const source = [normalizeZonePart(zone), mainLocation, subLocation, idLocNo]
    .map(normalizeIdentityPart)
    .join('|')
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }
  return hash.toString(16)
}

export const getFireExtinguisherCanonicalAssetKey = (row = {}) => {
  const explicitKey = text(row.canonicalAssetKey || row.canonical_asset_key)
  if (explicitKey) return explicitKey

  const catalogId = text(row.catalogId || row.catalog_id || row.fireExtinguisherId)
  if (catalogId) return `catalog:${catalogId}`

  const activeIdentityKey = text(row.activeIdentityKey || row.active_identity_key)
  if (activeIdentityKey) return `identity:${activeIdentityKey}`

  const barcodeNo = text(row.barcodeNo || row.barcode_no)
  if (barcodeNo) return `barcode:${normalizeIdentityPart(barcodeNo)}`

  const idLocNo = text(row.idLocNo || row.id_loc_no)
  const mainLocation = text(row.mainLocation || row.main_location || row.location)
  if (idLocNo && mainLocation) {
    return `location:${hashLocationIdentity({
      zone: row.zone,
      mainLocation,
      subLocation: row.subLocation || row.sub_location,
      idLocNo,
    })}`
  }

  return ''
}

export const getFireExtinguisherLegacyCatalogKey = (row = {}) => {
  const catalogId = text(row.catalogId || row.catalog_id || row.fireExtinguisherId)
  return catalogId ? `catalog:${catalogId}` : ''
}

export const sameFireExtinguisherAsset = (left = {}, right = {}) => {
  const leftKey = getFireExtinguisherCanonicalAssetKey(left)
  const rightKey = getFireExtinguisherCanonicalAssetKey(right)
  if (leftKey && rightKey) return leftKey === rightKey

  const leftLegacyKey = getFireExtinguisherLegacyCatalogKey(left)
  const rightLegacyKey = getFireExtinguisherLegacyCatalogKey(right)
  return Boolean(leftLegacyKey && rightLegacyKey && leftLegacyKey === rightLegacyKey)
}
