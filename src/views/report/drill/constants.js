import {
  Activity,
  ClipboardCheck,
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
