import { FRT_TRUCK_REFERENCE } from './reference'

const hasOwn = (item, key) => Object.prototype.hasOwnProperty.call(item || {}, key)

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const normalizeFrtTruckReference = (value = {}) => {
  const hasExplicitReference = [
    'truckId',
    'truck_id',
    'id',
    'name',
    'truckName',
    'truck_name',
    'plateNo',
    'plate_no',
    'value',
    'title',
    'roadTaxExpiry',
    'road_tax_expiry',
    'insuranceExpiry',
    'insurance_expiry',
    'puspakomExpiry',
    'puspakom_expiry',
  ].some((key) => hasOwn(value, key))
  const fallback = hasExplicitReference ? {} : FRT_TRUCK_REFERENCE

  return {
    truckId: String(value.truckId ?? value.truck_id ?? value.id ?? '').trim(),
    name: String(value.name ?? value.truckName ?? value.truck_name ?? '').trim(),
    plateNo: String(
      value.plateNo ?? value.plate_no ?? value.value ?? value.title ?? fallback.plateNo ?? '',
    ).trim(),
    roadTaxExpiry: String(
      value.roadTaxExpiry ?? value.road_tax_expiry ?? fallback.roadTaxExpiry ?? '',
    ).trim(),
    insuranceExpiry: String(
      value.insuranceExpiry ?? value.insurance_expiry ?? fallback.insuranceExpiry ?? '',
    ).trim(),
    puspakomExpiry: String(
      value.puspakomExpiry ?? value.puspakom_expiry ?? fallback.puspakomExpiry ?? '',
    ).trim(),
  }
}

export const normalizeFrtTruckOption = (value = {}) => {
  const reference = normalizeFrtTruckReference(value)
  const plateNo = String(reference.plateNo || value.value || value.title || '')
    .trim()
    .toUpperCase()
  if (!plateNo) return null
  return {
    ...value,
    id: String(value.truckId || value.truck_id || value.id || plateNo).trim(),
    truckId: String(value.truckId || value.truck_id || value.id || '').trim(),
    plateNo,
    value: plateNo,
    title: plateNo,
    name: String(reference.name || value.description || '').trim(),
    description: String(reference.name || value.description || '').trim(),
    roadTaxExpiry: reference.roadTaxExpiry,
    insuranceExpiry: reference.insuranceExpiry,
    puspakomExpiry: reference.puspakomExpiry,
  }
}

export const defaultFrtTruckOption = () =>
  normalizeFrtTruckOption({
    ...FRT_TRUCK_REFERENCE,
    name: 'Fire Truck',
    value: FRT_TRUCK_REFERENCE.plateNo,
  })

export const resolveSelectedFrtTruckPlate = (form = {}) => {
  const reference = normalizeFrtTruckReference(form.frtTruckReference || form.frt_truck_reference)
  const direct =
    String(
      form.frtTruckPlateNo ||
        form.frt_truck_plate_no ||
        form.mainLocation ||
        form.main_location ||
        form.selectedLocation ||
        form.location ||
        '',
    )
      .split('>')
      .map((part) => part.trim())
      .filter(Boolean)[0] || ''
  if (direct) {
    if (normalizeKey(direct) === normalizeKey('FIRE TRUCK')) return reference.plateNo
    if (form.frtTruckPlateNo || form.frt_truck_plate_no || form.frtTruckId || form.frt_truck_id) {
      return direct
    }
    return /\d/.test(direct) ? direct : ''
  }
  return form.frtTruckId || form.frt_truck_id ? reference.plateNo : ''
}
