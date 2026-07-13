import { formatInspectionDisplayLocationTitle } from '../form/components/InspectionFormDisplaySections'

const text = (value) => String(value || '').trim()

const appendField = (fields, key, label, value) => {
  const renderedValue = text(value)
  if (!renderedValue) return fields
  fields.push({ key, label, value: renderedValue })
  return fields
}

const formatZoneValue = (value) => {
  const raw = text(value)
  if (!raw) return ''
  return /^zone\b/i.test(raw) ? raw : `Zone ${raw}`
}

const getLocationDisplayValue = (inspectionType, value, parentValue = '') => {
  const rawValue = text(value)
  if (!rawValue) return ''
  return (
    formatInspectionDisplayLocationTitle(inspectionType, rawValue, text(parentValue)) || rawValue
  )
}

export const createZoneLocationDetailContextFields =
  ({ typeLabel, inspectionType, mainLabel = 'Main Area', locationLabel = 'Location' }) =>
  (form = {}, record = {}) => {
    const fields = [{ key: 'type', label: 'Type', value: typeLabel }]
    const zone = formatZoneValue(form.zone || record.zone || record.selectedZone)
    const mainLocation = text(form.mainLocation || record.mainLocation || record.main_location)
    const subLocation = text(form.subLocation || record.subLocation || record.sub_location)

    appendField(fields, 'zone', 'Zone', zone)
    appendField(
      fields,
      'main-location',
      mainLabel,
      getLocationDisplayValue(inspectionType, mainLocation),
    )
    appendField(
      fields,
      'sub-location',
      locationLabel,
      getLocationDisplayValue(inspectionType, subLocation, mainLocation),
    )
    return fields
  }

export const createLocationDetailContextFields =
  ({ typeLabel, inspectionType, primaryLabel = 'Location', secondaryLabel = 'Sub-location' }) =>
  (form = {}, record = {}) => {
    const fields = [{ key: 'type', label: 'Type', value: typeLabel }]
    const mainLocation = text(
      form.mainLocation || record.mainLocation || record.main_location || record.location,
    )
    const subLocation = text(form.subLocation || record.subLocation || record.sub_location)

    appendField(
      fields,
      'primary-location',
      primaryLabel,
      getLocationDisplayValue(inspectionType, mainLocation),
    )
    appendField(
      fields,
      'secondary-location',
      secondaryLabel,
      getLocationDisplayValue(inspectionType, subLocation, mainLocation),
    )
    return fields
  }

export const createTruckDetailContextFields =
  ({ typeLabel, inspectionType, truckLabel = 'Truck', compartmentLabel = 'Compartment' }) =>
  (form = {}, record = {}) => {
    const fields = [{ key: 'type', label: 'Type', value: typeLabel }]
    const truck =
      text(form.frtTruckPlateNo) ||
      text(record.frtTruckPlateNo) ||
      text(record.frt_truck_plate_no) ||
      text(form.frtTruckReference?.plateNo) ||
      text(record.frtTruckReference?.plateNo) ||
      text(record.frt_truck_reference?.plateNo) ||
      text(form.mainLocation || record.mainLocation || record.location)
    const compartment = text(form.subLocation || record.subLocation || record.sub_location)
    const shift = text(form.frtShift || record.frtShift || record.frt_shift)
    const truckReference =
      form.frtTruckReference || record.frtTruckReference || record.frt_truck_reference || {}

    appendField(
      fields,
      'truck',
      truckLabel,
      getLocationDisplayValue(inspectionType, truck) || truck,
    )
    appendField(fields, 'compartment', compartmentLabel, compartment)
    appendField(fields, 'shift', 'Shift', shift)
    appendField(fields, 'plate-number', 'Plate No.', truckReference.plateNo || truck)
    appendField(fields, 'road-tax-expiry', 'Road Tax Expiry', truckReference.roadTaxExpiry)
    appendField(fields, 'insurance-expiry', 'Insurance Expiry', truckReference.insuranceExpiry)
    appendField(fields, 'puspakom-expiry', 'Puspakom Expiry', truckReference.puspakomExpiry)
    return fields
  }
