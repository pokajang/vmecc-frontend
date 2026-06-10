import {
  Droplets,
  Flame,
  LifeBuoy,
  MapPinned,
  ShieldAlert,
  Sparkles,
  TestTube,
  Truck,
} from 'lucide-react'

export const INSPECTION_INCIDENT_TYPE_OPTIONS = [
  {
    value: 'Plant Status Patrol',
    title: 'Plant Status Patrol',
    description: 'Routine plant zones and equipment status patrol.',
    icon: Sparkles,
  },
  {
    value: 'Fire Water Pump House Inspection',
    title: 'Fire Water Pump House Inspection',
    description: 'Pump mode/pressure and leakage checks.',
    icon: Droplets,
  },
  {
    value: 'Site Patrol Observation',
    title: 'Site Patrol Observation',
    description: 'Site activity, control checks, and hazards.',
    icon: ShieldAlert,
  },
  {
    value: 'Vehicle / ER Equipment Pre-Operational Inspection',
    title: 'Vehicle / ER Equipment Pre-Operational',
    description: 'Readiness checks before deployment or shift start.',
    icon: Truck,
  },
  {
    value: 'Housekeeping / 5S Inspection',
    title: 'Housekeeping / 5S Inspection',
    description: 'Housekeeping conditions and workplace order checks.',
    icon: ShieldAlert,
  },
  {
    value: 'Fire Extinguisher Monthly Inspection',
    title: 'Fire Extinguisher Monthly Inspection',
    description: 'Extinguisher availability, pressure, and access checks.',
    icon: Flame,
  },
  {
    value: 'Chemical Safety Review',
    title: 'Chemical Safety Review',
    description: 'Chemical storage, SDS, and labeling checks.',
    icon: TestTube,
  },
  {
    value: 'Wildlife Monitoring',
    title: 'Wildlife Monitoring',
    description: 'Wildlife trap/cage condition and sighting follow-up.',
    icon: LifeBuoy,
  },
  {
    value: 'Other Inspection',
    title: 'Other Inspection',
    description: 'Use when the checklist is customized.',
    icon: Sparkles,
  },
]

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
  { value: 'incidentType:asc', label: 'Inspection type A-Z' },
  { value: 'incidentType:desc', label: 'Inspection type Z-A' },
]
