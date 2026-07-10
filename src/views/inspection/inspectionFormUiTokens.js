export const CONTINUATION_LABELS = Object.freeze({
  location: 'Next location',
  compartment: 'Next compartment',
  kit: 'Next kit',
})

export const CONTINUATION_SCAN_LABEL = 'Inspect More FE'

export const PARTIAL_STATE_PROMPTS = Object.freeze({
  locationFlow: 'Choose a location to continue inspection.',
  fireExtinguisherFlow: 'Choose a location to load fire extinguishers.',
  fireTruckFlow: 'Choose a compartment to load fire truck readiness items.',
})

export const getContinuationLabel = (labelKey = 'location') =>
  CONTINUATION_LABELS[labelKey] || `Next ${labelKey}`
