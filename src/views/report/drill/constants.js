import {
  Activity,
  ClipboardCheck,
  Droplets,
  Flame,
  LifeBuoy,
  MapPinned,
  ShieldCheck,
  Sun,
} from 'lucide-react'

export const DRILL_TYPE_OPTIONS = [
  {
    value: 'Fire Drill',
    title: 'Fire Drill',
    description: 'Evacuation and fire response readiness exercise.',
    icon: Flame,
  },
  {
    value: 'Rescue Drill',
    title: 'Rescue Drill',
    description: 'Extraction and rescue workflow simulation.',
    icon: LifeBuoy,
  },
  {
    value: 'Evacuation Drill',
    title: 'Evacuation Drill',
    description: 'Site-wide muster and evacuation time validation.',
    icon: Activity,
  },
  {
    value: 'Emergency Response Drill',
    title: 'Emergency Response Drill',
    description: 'Cross-team emergency coordination exercise.',
    icon: ShieldCheck,
  },
]

export const DRILL_ENVIRONMENT_OPTIONS = [
  {
    value: 'Clear',
    title: 'Clear',
    description: 'Normal weather and visibility.',
    icon: Sun,
  },
  {
    value: 'Adverse',
    title: 'Adverse',
    description: 'Rain, strong wind, or reduced visibility.',
    icon: Activity,
  },
  {
    value: 'Indoor / Controlled',
    title: 'Indoor / Controlled',
    description: 'Controlled environment drill condition.',
    icon: ClipboardCheck,
  },
]

export const DRILL_LOCATION_OPTIONS = [
  {
    value: 'Main plant',
    title: 'Main plant',
    description: 'Core operational plant area.',
    icon: MapPinned,
  },
  {
    value: 'Stockpile area',
    title: 'Stockpile area',
    description: 'Stockpile and access roads.',
    icon: MapPinned,
  },
  {
    value: 'Workshop',
    title: 'Workshop',
    description: 'Workshop and maintenance zone.',
    icon: MapPinned,
  },
  {
    value: 'Admin block',
    title: 'Admin block',
    description: 'Office and admin facilities.',
    icon: MapPinned,
  },
]

export const DRILL_NEW_SECTIONS = ['setup', 'personnel', 'details', 'chronology', 'analysis']

export const DRILL_EXERCISE_CATEGORY_OPTIONS = [
  {
    value: 'Fire',
    title: 'Fire',
    description: 'Fire response and suppression procedures.',
    icon: Flame,
  },
  {
    value: 'Rescue',
    title: 'Rescue',
    description: 'Casualty extraction and rescue procedures.',
    icon: LifeBuoy,
  },
  {
    value: 'Hazmat / Oil Spill',
    title: 'Hazmat / Oil Spill',
    description: 'Hazardous material or spill control procedures.',
    icon: Droplets,
  },
  {
    value: 'Special Assistance',
    title: 'Special Assistance',
    description: 'Special assistance and support services.',
    icon: ShieldCheck,
  },
]

export const DRILL_EXERCISE_ROLE_OPTIONS = [
  'SC',
  'ASC',
  'TRT1',
  'TRT2',
  'TRT3',
  'TRT4',
  'Observer',
  'Participant',
]

export const DRILL_FIELD_LIMITS = Object.freeze({
  shortText: 190,
  erpTitle: 500,
  listItem: 2000,
  chronologyAction: 4000,
  narrative: 20000,
  objectives: 25,
  erpReferences: 25,
  personnel: 100,
  chronology: 250,
  analysisRows: 50,
  photos: 10,
})
