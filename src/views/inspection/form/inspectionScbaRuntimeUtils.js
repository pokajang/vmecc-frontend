export const slugSegment = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const customFieldKeyFromLabel = (label = '') => {
  const slug = slugSegment(label) || 'check'
  return slug.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())
}

export const getScbaChecksField = (sectionKey) =>
  sectionKey === 'backPlate'
    ? 'scbaBackPlateChecks'
    : sectionKey === 'cylinder'
      ? 'scbaCylinderChecks'
      : sectionKey === 'faceMask'
        ? 'scbaFaceMaskChecks'
        : ''
