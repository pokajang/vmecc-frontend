import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Flame,
  LifeBuoy,
  MapPinned,
  ShieldAlert,
  Sparkles,
  Sun,
  TestTube,
  ThermometerSun,
  Wind,
} from 'lucide-react'

export const ERCO_INCIDENT_TYPE_OPTIONS = [
  {
    value: 'Fire',
    title: 'Fire',
    description: 'Firefighting and fire response.',
    icon: Flame,
  },
  {
    value: 'Rescue',
    title: 'Rescue',
    description: 'Emergency rescue and extraction.',
    icon: LifeBuoy,
  },
  {
    value: 'Hazmat',
    title: 'Hazmat',
    description: 'Hazmat containment and cleanup.',
    icon: TestTube,
  },
  {
    value: 'Oil Spill',
    title: 'Oil Spill',
    description: 'Oil spill control and recovery.',
    icon: Droplets,
  },
  {
    value: 'Special Assistance',
    title: 'Special Assistance',
    description: 'Support for uncommon incidents.',
    icon: Sparkles,
  },
  {
    value: 'Special Services',
    title: 'Special Services',
    description: 'Planned standby and technical support.',
    icon: ShieldAlert,
  },
]

export const ERCO_WEATHER_OPTIONS = [
  {
    value: 'Clear',
    title: 'Clear',
    description: 'No significant cloud and good visibility.',
    icon: Sun,
  },
  {
    value: 'Partly Cloudy',
    title: 'Partly Cloudy',
    description: 'Mixed sun and cloud with generally stable conditions.',
    icon: CloudSun,
  },
  {
    value: 'Cloudy',
    title: 'Cloudy',
    description: 'Mostly cloud cover with limited direct sunlight.',
    icon: Cloud,
  },
  {
    value: 'Overcast',
    title: 'Overcast',
    description: 'Complete cloud cover and dull sky conditions.',
    icon: Cloud,
  },
  {
    value: 'Showers',
    title: 'Showers',
    description: 'Intermittent light-to-moderate rain episodes.',
    icon: CloudRain,
  },
  {
    value: 'Raining',
    title: 'Raining',
    description: 'Continuous rainfall affecting operations and visibility.',
    icon: CloudRain,
  },
  {
    value: 'Thunderstorm',
    title: 'Thunderstorm',
    description: 'Storm with thunder, rain, and possible strong gusts.',
    icon: CloudLightning,
  },
  {
    value: 'Lightning',
    title: 'Lightning',
    description: 'Frequent lightning activity observed nearby.',
    icon: CloudLightning,
  },
  {
    value: 'Windy',
    title: 'Windy',
    description: 'Noticeable sustained wind impacting field movement.',
    icon: Wind,
  },
  {
    value: 'Hot',
    title: 'Hot',
    description: 'High heat conditions with thermal stress risk.',
    icon: ThermometerSun,
  },
  {
    value: 'Hazy',
    title: 'Hazy',
    description: 'Reduced clarity due to haze or suspended particles.',
    icon: CloudSun,
  },
  {
    value: 'Foggy',
    title: 'Foggy',
    description: 'Low visibility caused by fog or mist.',
    icon: CloudFog,
  },
  {
    value: 'Unknown',
    title: 'Unknown',
    description: 'Weather condition was not captured at reporting time.',
    icon: ShieldAlert,
  },
]

export const ERCO_LOCATION_OPTIONS = [
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
