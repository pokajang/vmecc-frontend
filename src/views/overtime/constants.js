export const overtimeSortOptions = [
  { value: 'appliedAt:desc', label: 'Latest applied' },
  { value: 'appliedAt:asc', label: 'Oldest applied' },
  { value: 'durationMinutes:desc', label: 'Longest duration' },
  { value: 'durationMinutes:asc', label: 'Shortest duration' },
]

export { WORKFLOW_STATUS_COLOR as statusColorMap } from 'src/constants/statusPresentation'
