const INSPECTION_TYPES = [
  {
    key: 'er-aux-equipment-inspection',
    label: 'Emergency Response Auxiliary Equipment',
    formType: 'ER Aux Equipment Inspection',
  },
  {
    key: 'fire-extinguisher-inspection',
    label: 'Fire Extinguisher',
    formType: 'Fire Extinguisher Inspection',
  },
  { key: 'frt-daily-inspection', label: 'Fire Truck Daily Readiness' },
  {
    key: 'high-angle-rescue-equipment-inspection',
    label: 'High Angle Rescue Equipment',
    formType: 'High Angle Rescue Equipment Inspection',
  },
  {
    key: 'hydraulic-rescue-tools-inspection',
    label: 'Hydraulic Rescue Tools',
    formType: 'Hydraulic Rescue Tools Inspection',
  },
  { key: 'scba-inspection', label: 'SCBA', formType: 'SCBA Inspection' },
  {
    key: 'health-safety-environment-inspection',
    label: 'Health Safety Environment',
    formType: 'Health Safety Environment Inspection',
  },
  { key: 'general-inspection', label: 'General Inspection', chooserLabel: 'General' },
]

const MATRIX_STATES = ['empty', 'partial', 'missing-required', 'complete-with-next-location']

const TYPE_ALIASES = new Map(
  INSPECTION_TYPES.flatMap((entry) => [
    [entry.label.toLowerCase(), entry],
    [`${entry.label.toLowerCase()} inspection`, entry],
  ]),
)

const resolveInspectionType = (value) => {
  const normalized = String(value || '')
    .replace(/\s*inspection\s*$/i, '')
    .trim()
    .toLowerCase()
  return (
    INSPECTION_TYPES.find((entry) => {
      const label = entry.label
        .replace(/\s*inspection\s*$/i, '')
        .trim()
        .toLowerCase()
      return label === normalized
    }) ||
    TYPE_ALIASES.get(
      String(value || '')
        .trim()
        .toLowerCase(),
    ) ||
    null
  )
}

module.exports = { INSPECTION_TYPES, MATRIX_STATES, resolveInspectionType }
