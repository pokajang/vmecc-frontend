export const ER_ASSESSMENT_DOCUMENT = Object.freeze({
  title: 'Emergency Response Assessment',
  code: 'VMECC-OPS-016',
  revision: '0',
})

export const ER_ASSESSMENT_SCHEMA_VERSION = 1
export const ER_ASSESSMENT_TEMPLATE_VERSION = 'VMECC-OPS-016-R0'

export const ER_RESPONSE_OPTIONS = Object.freeze(['Yes', 'No', 'N/A'])

export const ER_FIELD_LABELS = Object.freeze({
  company: 'Company being assessed',
  assessmentDate: 'Assessment date',
  location: 'Location',
  assessmentType: 'Work activity being assessed',
  scopeOfWork: 'Work activity being assessed',
  gapAndImmediateAction: 'Gap and immediate action',
  assemblyArea: 'Assembly area (AA)',
})

export const ER_RESPONSE_FIELD_LABEL = 'Gap and immediate action'
export const ER_ASSEMBLY_AREA_FIELD_SUFFIX = '.escape-routes'

export const ER_ASSESSMENT_TYPES = Object.freeze([
  {
    value: 'working-at-height',
    label: 'Working at Height',
    worstCase:
      'Fall from height, fatality, suspension trauma, or injury caused by falling objects.',
    requirements: [
      'Scaffold tagged & inspected (Green/Yellow/Red)',
      'Fall protection system',
      'Anchor - Body - Connector',
      'Tool fall protection system (Lanyard / Netting / Toe board)',
      'Escape Routes to AA',
      'Barricade & exclusion zone established',
    ],
    requirementIds: [
      'wah.scaffold-tagged',
      'wah.fall-protection',
      'wah.anchor-body-connector',
      'wah.tool-fall-protection',
      'wah.escape-routes',
      'wah.exclusion-zone',
    ],
  },
  {
    value: 'confined-space',
    label: 'Confined Space / Enclosed Space Work',
    worstCase: 'Asphyxiation, toxic gas exposure, or multiple fatalities.',
    requirements: [
      'Confined Space Permit approved',
      'Gas testing completed',
      'Standby person',
      'Ventilation in operation',
      'Rescue equipment available',
      'Escape Routes to AA',
      'Barricade & exclusion zone established',
    ],
    requirementIds: [
      'cs.permit-approved',
      'cs.gas-testing',
      'cs.standby-person',
      'cs.ventilation',
      'cs.rescue-equipment',
      'cs.escape-routes',
      'cs.exclusion-zone',
    ],
  },
  {
    value: 'hot-work',
    label: 'Hot Work Activities',
    worstCase: 'Fire, explosion, multiple injuries, or plant damage.',
    requirements: [
      'Fire watch assigned',
      'Fire extinguisher available',
      'Flammable materials removed/protected',
      'FDA Isolation Approval',
      'Escape Routes to AA',
      'Barricade & exclusion zone established',
    ],
    requirementIds: [
      'hw.fire-watch',
      'hw.fire-extinguisher',
      'hw.flammables-controlled',
      'hw.fda-isolation',
      'hw.escape-routes',
      'hw.exclusion-zone',
    ],
  },
  {
    value: 'lifting-operations',
    label: 'Lifting Operations',
    worstCase: 'Dropped load, crushing injury, or crane collapse.',
    requirements: [
      'Equipment inspected',
      'Taglines used',
      'Signal Man',
      'Communication Device',
      'Escape Routes to AA',
      'Barricade & exclusion zone established',
    ],
    requirementIds: [
      'lift.equipment-inspected',
      'lift.taglines',
      'lift.signal-man',
      'lift.communication',
      'lift.escape-routes',
      'lift.exclusion-zone',
    ],
  },
  {
    value: 'electrical-work',
    label: 'Electrical / Energized Work',
    worstCase: 'Electrocution, arc flash, or fire.',
    requirements: [
      'LOTO implemented',
      'Isolation verified',
      'Appropriate PPE',
      'Escape Routes to AA',
      'Barricade & exclusion zone established',
    ],
    requirementIds: [
      'elec.loto',
      'elec.isolation-verified',
      'elec.ppe',
      'elec.escape-routes',
      'elec.exclusion-zone',
    ],
  },
])

export const ER_ASSESSMENT_STEPS = Object.freeze([
  { key: 'setup', label: 'Assessment details' },
  { key: 'requirements', label: 'Response readiness' },
  { key: 'rescue', label: 'Rescue planning' },
  { key: 'equipment', label: 'Rescue equipment' },
  { key: 'signoff', label: 'Sign-off' },
])

export const normalizeErAssessmentTemplate = (value = {}) => {
  const types = Array.isArray(value?.assessmentTypes) ? value.assessmentTypes : []
  if (!types.length) return ER_ASSESSMENT_TYPES
  return types.map((type) => ({
    value: String(type?.id || ''),
    label: String(type?.label || ''),
    worstCase: String(type?.worstCaseScenario || ''),
    requirements: (Array.isArray(type?.requirements) ? type.requirements : []).map((row) =>
      String(row?.label || ''),
    ),
    requirementIds: (Array.isArray(type?.requirements) ? type.requirements : []).map((row) =>
      String(row?.id || ''),
    ),
  }))
}

export const getErAssessmentType = (value, assessmentTypes = ER_ASSESSMENT_TYPES) =>
  assessmentTypes.find((item) => item.value === String(value || '')) ||
  assessmentTypes.find((item) => item.label === String(value || '')) ||
  null
