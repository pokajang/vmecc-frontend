export const MOCK_LEAVE_RECORD_IDS = new Set([
  'LV-2026-013',
  'LV-2026-009',
  'LV-2026-006',
  'LV-2026-002',
])

export const leaveSortOptions = [
  { value: 'appliedAt:desc', label: 'Latest applied' },
  { value: 'appliedAt:asc', label: 'Oldest applied' },
  { value: 'days:desc', label: 'Most days' },
  { value: 'days:asc', label: 'Least days' },
]

export const statusColorMap = {
  Draft: 'secondary',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'dark',
}

export const LEAVE_TYPE_ID_MARKERS = {
  'Annual Leave': 'AL',
  'Medical Leave': 'ML',
  'Emergency Leave': 'EL',
  'Compassionate Leave': 'CL',
  'Maternity Leave': 'MAT',
  'Paternity Leave': 'PAT',
  'Unpaid Leave': 'UL',
  'Other Leave': 'OL',
}

export const shiftConfigs = {
  normal: {
    label: 'Normal Shift (8:30 AM - 5:30 PM)',
    startOptions: [
      { value: 'shift-start', label: '08:30 AM' },
      { value: 'midpoint', label: '01:00 PM' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 PM' },
      { value: 'shift-end', label: '05:30 PM' },
    ],
    note: '',
  },
  day12: {
    label: 'Day Shift (7:00 AM - 7:00 PM)',
    startOptions: [
      { value: 'shift-start', label: '07:00 AM' },
      { value: 'midpoint', label: '01:00 PM' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 PM' },
      { value: 'shift-end', label: '07:00 PM' },
    ],
    note: '',
  },
  night12: {
    label: 'Night Shift (7:00 PM - 7:00 AM)',
    startOptions: [
      { value: 'shift-start', label: '07:00 PM' },
      { value: 'midpoint', label: '01:00 AM (+1 day)' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 AM (+1 day)' },
      { value: 'shift-end', label: '07:00 AM (+1 day)' },
    ],
    note: 'Overnight shift ends on the next day.',
  },
}

export const shiftOptions = Object.entries(shiftConfigs).map(([value, config]) => ({
  value,
  label: config.label,
}))

export const leaveFieldRules = {
  'Annual Leave': {
    showCoverage: false,
    coverageRequired: false,
    showAttachment: false,
    attachmentRequired: false,
  },
  'Medical Leave': {
    showCoverage: true,
    coverageRequired: false,
    showAttachment: true,
    attachmentRequired: true,
  },
  'Emergency Leave': {
    showCoverage: true,
    coverageRequired: false,
    showAttachment: true,
    attachmentRequired: false,
  },
  'Compassionate Leave': {
    showCoverage: true,
    coverageRequired: false,
    showAttachment: true,
    attachmentRequired: true,
  },
  'Maternity Leave': {
    showCoverage: true,
    coverageRequired: false,
    showAttachment: true,
    attachmentRequired: false,
  },
  'Paternity Leave': {
    showCoverage: true,
    coverageRequired: false,
    showAttachment: true,
    attachmentRequired: false,
  },
  'Unpaid Leave': {
    showCoverage: true,
    coverageRequired: 'multi-day',
    showAttachment: true,
    attachmentRequired: true,
  },
  'Other Leave': {
    showCoverage: true,
    coverageRequired: true,
    showAttachment: true,
    attachmentRequired: true,
  },
}

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])
export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
export const SUPPORTED_DOCUMENT_MIME_TYPES = new Set(['application/pdf'])
export const IMAGE_COMPRESSION_TRIGGER_BYTES = 2 * 1024 * 1024
export const IMAGE_COMPRESSION_TARGET_BYTES = 1 * 1024 * 1024
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
export const IMAGE_COMPRESSION_MAX_DIMENSION = 1920
export const IMAGE_COMPRESSION_MIN_QUALITY = 0.55
