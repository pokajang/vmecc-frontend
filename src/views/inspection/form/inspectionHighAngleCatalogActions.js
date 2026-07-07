import {
  makeHighAngleGroupKey,
  normalizeHighAngleChecks,
  normalizeHighAngleCustomCompartments,
  slugHighAngleSegment,
} from '../types/high-angle/helpers'

const text = (value) => String(value || '').trim()

const normalizeKitName = (value) => {
  const normalized = text(value)
  return normalized.toLowerCase() === 'rescue rope' ? 'Rescue Rope' : normalized
}

const normalizeCompartmentPayload = (payload = {}) => ({
  mainLocation: normalizeKitName(payload.mainLocation),
  location: text(payload.location),
  subLocation: text(payload.subLocation),
})

const sameText = (left, right) => text(left).toLowerCase() === text(right).toLowerCase()

const sameCompartment = (left = {}, right = {}) =>
  sameText(left.mainLocation, right.mainLocation) &&
  makeHighAngleGroupKey(left) === makeHighAngleGroupKey(right)

const buildCompartmentId = ({ mainLocation, location, subLocation }) =>
  `custom-compartment:${slugHighAngleSegment(mainLocation)}:${slugHighAngleSegment(
    `${location} ${subLocation}`,
  )}`

const buildItemId = ({ mainLocation, location, subLocation, equipment }) =>
  `custom-item:${slugHighAngleSegment(mainLocation)}:${slugHighAngleSegment(
    `${location} ${subLocation}`,
  )}:${slugHighAngleSegment(equipment)}:${Date.now().toString(36)}`

const withoutMatchingCompartment = (rows = [], target = {}) =>
  normalizeHighAngleCustomCompartments(rows).filter((row) => !sameCompartment(row, target))

const withoutRowsInCompartment = (rows = [], target = {}) =>
  normalizeHighAngleChecks(rows).filter((row) => !sameCompartment(row, target))

export const addHighAngleCustomCompartment = (form = {}, payload = {}) => {
  const compartment = normalizeCompartmentPayload(payload)
  if (!compartment.mainLocation || (!compartment.location && !compartment.subLocation)) {
    return form
  }
  const current = normalizeHighAngleCustomCompartments(form.highAngleCustomCompartments)
  if (current.some((row) => sameCompartment(row, compartment))) return form

  return {
    ...form,
    highAngleCustomCompartments: [
      ...current,
      {
        id: buildCompartmentId(compartment),
        ...compartment,
        custom: true,
      },
    ],
  }
}

export const updateHighAngleCustomCompartment = (form = {}, target = {}, payload = {}) => {
  const nextCompartment = normalizeCompartmentPayload(payload)
  if (
    !nextCompartment.mainLocation ||
    (!nextCompartment.location && !nextCompartment.subLocation)
  ) {
    return form
  }
  const currentCompartments = normalizeHighAngleCustomCompartments(form.highAngleCustomCompartments)
  const currentChecks = normalizeHighAngleChecks(form.highAngleChecks)
  const targetKey = makeHighAngleGroupKey(target)
  const nextKey = makeHighAngleGroupKey(nextCompartment)

  return {
    ...form,
    highAngleCustomCompartments: currentCompartments.map((row) =>
      sameCompartment(row, target)
        ? {
            ...row,
            id: row.id || buildCompartmentId(nextCompartment),
            ...nextCompartment,
            custom: true,
          }
        : row,
    ),
    highAngleChecks: currentChecks.map((row) =>
      sameText(row.mainLocation, target.mainLocation) && makeHighAngleGroupKey(row) === targetKey
        ? {
            ...row,
            mainLocation: nextCompartment.mainLocation,
            location: nextCompartment.location,
            subLocation: nextCompartment.subLocation,
            id: String(row.id || '').startsWith('custom-item:')
              ? row.id.replace(slugHighAngleSegment(targetKey), slugHighAngleSegment(nextKey))
              : row.id,
          }
        : row,
    ),
  }
}

export const deleteHighAngleCustomCompartment = (form = {}, target = {}) => ({
  ...form,
  highAngleCustomCompartments: withoutMatchingCompartment(form.highAngleCustomCompartments, target),
  highAngleChecks: withoutRowsInCompartment(form.highAngleChecks, target),
})

export const addHighAngleCustomItem = (form = {}, payload = {}) => {
  const compartment = normalizeCompartmentPayload(payload)
  const equipment = text(payload.equipment)
  const quantity = text(payload.quantity)
  if (!compartment.mainLocation || !equipment) return form

  const currentChecks = normalizeHighAngleChecks(form.highAngleChecks)
  const currentCompartments = normalizeHighAngleCustomCompartments(form.highAngleCustomCompartments)
  const hasCompartment = currentCompartments.some((row) => sameCompartment(row, compartment))

  return {
    ...form,
    highAngleCustomCompartments: hasCompartment
      ? currentCompartments
      : [
          ...currentCompartments,
          {
            id: buildCompartmentId(compartment),
            ...compartment,
            custom: true,
          },
        ],
    highAngleChecks: [
      {
        id: buildItemId({ ...compartment, equipment }),
        rowNumber: '',
        ...compartment,
        equipment,
        quantity,
        condition: '',
        remarks: '',
        conditionRemarks: '',
        conditionPhotos: [],
        equipmentSource: 'custom',
        isWorkbookSeedRow: false,
        isExtensionRow: true,
      },
      ...currentChecks,
    ],
  }
}

export const updateHighAngleCustomItem = (form = {}, target = {}, payload = {}) => {
  const rowId = text(target.id)
  if (!rowId) return form
  const equipment = text(payload.equipment)
  if (!equipment) return form
  const quantity = text(payload.quantity)
  const currentChecks = normalizeHighAngleChecks(form.highAngleChecks)

  return {
    ...form,
    highAngleChecks: currentChecks.map((row) =>
      text(row.id) === rowId
        ? {
            ...row,
            equipment,
            quantity,
            equipmentSource: 'custom',
            isWorkbookSeedRow: false,
            isExtensionRow: true,
          }
        : row,
    ),
  }
}

export const deleteHighAngleCustomItem = (form = {}, target = {}) => {
  const rowId = text(target.id)
  if (!rowId) return form
  return {
    ...form,
    highAngleChecks: normalizeHighAngleChecks(form.highAngleChecks).filter(
      (row) => text(row.id) !== rowId,
    ),
  }
}
