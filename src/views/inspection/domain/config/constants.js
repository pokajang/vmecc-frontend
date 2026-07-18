import { MapPinned } from 'lucide-react'
import { getInspectionTypeOptions } from '../../app/inspectionTypeRegistry'

export const INSPECTION_INCIDENT_TYPE_OPTIONS = getInspectionTypeOptions()

export const ALL_EXTINGUISHERS_DESKTOP_QUERY = '(min-width: 992px)'

export const INSPECTION_LOCATION_OPTIONS = [
  {
    value: 'Zone 1',
    title: 'Zone 1',
    description: 'Road near laboratory, Zone 4B and nearby roads.',
    icon: MapPinned,
  },
  {
    value: 'Zone 2',
    title: 'Zone 2',
    description: 'Stockpile A area and access roads.',
    icon: MapPinned,
  },
  {
    value: 'Zone 3',
    title: 'Zone 3',
    description: 'Stockpile E and lay down area.',
    icon: MapPinned,
  },
  {
    value: 'Zone 4',
    title: 'Zone 4',
    description: 'Natural pond, Hill 12, and connected roads.',
    icon: MapPinned,
  },
]

export const INSPECTION_SORT_OPTIONS = [
  { value: 'reportedAt:desc', label: 'Latest reported' },
  { value: 'reportedAt:asc', label: 'Earliest reported' },
  { value: 'incidentType:asc', label: 'Type A-Z' },
  { value: 'incidentType:desc', label: 'Type Z-A' },
]
