import {
  Activity,
  Gauge,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  TimerReset,
  Users,
} from 'lucide-react'

export const FITNESS_TEST_TYPE_OPTIONS = [
  {
    value: 'Endurance Test',
    title: 'Endurance Test',
    description: 'Cardio and sustained effort assessment.',
    icon: Activity,
  },
  {
    value: 'Strength Test',
    title: 'Strength Test',
    description: 'Strength and lifting capacity assessment.',
    icon: Gauge,
  },
  {
    value: 'Heat Stress Test',
    title: 'Heat Stress Test',
    description: 'Heat tolerance and monitoring protocol test.',
    icon: HeartPulse,
  },
  {
    value: 'Team Readiness Test',
    title: 'Team Readiness Test',
    description: 'Group coordination and readiness assessment.',
    icon: Users,
  },
]

export const FITNESS_TEST_CONDITION_OPTIONS = [
  {
    value: 'Routine',
    title: 'Routine',
    description: 'Standard planned testing conditions.',
    icon: ShieldCheck,
  },
  {
    value: 'Re-test',
    title: 'Re-test',
    description: 'Follow-up test after remediation.',
    icon: TimerReset,
  },
  {
    value: 'Special',
    title: 'Special',
    description: 'Special testing condition or requirement.',
    icon: Activity,
  },
]

export const FITNESS_TEST_LOCATION_OPTIONS = [
  {
    value: 'Training yard',
    title: 'Training yard',
    description: 'Outdoor physical training area.',
    icon: MapPinned,
  },
  {
    value: 'Gym / Indoor hall',
    title: 'Gym / Indoor hall',
    description: 'Indoor exercise and assessment facility.',
    icon: MapPinned,
  },
  {
    value: 'Field track',
    title: 'Field track',
    description: 'Running and endurance route.',
    icon: MapPinned,
  },
  {
    value: 'Medical bay',
    title: 'Medical bay',
    description: 'Monitored assessment environment.',
    icon: MapPinned,
  },
]
