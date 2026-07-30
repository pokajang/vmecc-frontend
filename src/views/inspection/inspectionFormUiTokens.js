export const CONTINUATION_LABELS = Object.freeze({
  location: 'Next location',
  compartment: 'Next compartment',
  kit: 'Next kit',
})

export const CONTINUATION_SCAN_LABEL = 'Inspect More FE'

export const PARTIAL_STATE_PROMPTS = Object.freeze({
  locationFlow: 'No location selected',
  fireExtinguisherFlow: 'No extinguisher location selected',
  fireTruckFlow: 'No compartment selected',
})

export const getContinuationLabel = (labelKey = 'location') =>
  CONTINUATION_LABELS[labelKey] || `Next ${labelKey}`
