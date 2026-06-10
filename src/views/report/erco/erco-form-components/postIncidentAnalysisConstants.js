import { defaultPostIncidentAnalysis } from '../utils'

export const ACTIVE_CARD_BG = 'rgba(0, 126, 122, 0.2)'
export const ACTIVE_CARD_BORDER = 'rgba(0, 126, 122, 0.45)'
export const TOGGLE_CARD_BG = 'var(--cui-light-bg-subtle, #f8f9fa)'
export const TOGGLE_CARD_BORDER = 'var(--cui-border-color, #d8dbe0)'
export const SHOW_MORE_VALUE = '__show_more__'
export const SHOW_LESS_VALUE = '__show_less__'

export const PRESET_OPTIONS = {
  strengths: [
    {
      value: 'Response time met KPI target',
      title: 'KPI Response Time',
    },
    {
      value: 'Response time in line with 2025 KPI (1.2 Adherence Response Time) targets.',
      title: '2025 KPI (1.2) response time achieved',
    },
    {
      value: 'Available and operational resources',
      title: 'Resources Ready',
    },
    {
      value: 'Available and operational resources: ER equipment, response vehicles & PPE.',
      title: 'ER equipment, vehicles and PPE available',
    },
    {
      value: 'VMECC TRT trained in Wild Life Management.',
      title: 'VMECC TRT trained in Wild Life Management',
    },
    {
      value: 'Good support from Yard Leader.',
      title: 'Good support from Yard Leader',
    },
    {
      value: 'Good inter-team coordination',
      title: 'Coordination',
    },
    {
      value: 'Clear command communication',
      title: 'Command Clarity',
    },
    {
      value: 'Rapid incident command activation and role assignment.',
      title: 'Rapid incident command activation',
    },
    {
      value: 'Clear radio communication and timely status updates.',
      title: 'Clear radio communication',
    },
    {
      value: 'Effective scene control and hazard isolation.',
      title: 'Effective scene control',
    },
    {
      value: 'Safe casualty stabilization and handover.',
      title: 'Safe casualty stabilization and handover',
    },
    {
      value: 'Good cooperation with operations and security teams.',
      title: 'Strong operations and security coordination',
    },
  ],
  resourcesMobilised: [
    {
      value: 'Rapid Intervention Vehicle (RIV)',
      title: 'RIV',
    },
    {
      value: 'Walkie Talkie',
      title: 'Walkie Talkie',
    },
    {
      value: 'PPE',
      title: 'PPE',
    },
    {
      value: 'Barricade and cones',
      title: 'Barricade Set',
    },
    {
      value: 'Fire engine with charged hose line and pump support',
      title: 'Fire engine and charged hose line',
    },
    {
      value: 'Portable fire extinguishers were deployed at key control points',
      title: 'Portable fire extinguishers deployed',
    },
    {
      value: 'Spill kit and absorbent materials were mobilised for containment',
      title: 'Spill kit and absorbents mobilised',
    },
    {
      value: 'Gas detector and atmospheric monitoring equipment were used',
      title: 'Gas detector and atmospheric monitor used',
    },
    {
      value: 'SCBA set and spare cylinders were prepared for entry team',
      title: 'SCBA set and spare cylinders prepared',
    },
    {
      value: 'Trauma bag, AED and first-aid equipment were staged on scene',
      title: 'Trauma bag, AED and first-aid equipment staged',
    },
    {
      value: 'Stretcher and patient immobilisation equipment were available',
      title: 'Stretcher and immobilisation equipment available',
    },
    {
      value: 'Rescue tools and forcible-entry equipment were mobilised',
      title: 'Rescue and forcible-entry tools mobilised',
    },
    {
      value: 'Portable lighting units were deployed to improve scene visibility',
      title: 'Portable lighting units deployed',
    },
    {
      value: 'Emergency response boat and water rescue gear were readied',
      title: 'Water rescue boat and gear readied',
    },
    {
      value: 'Traffic control barriers and caution tape were installed',
      title: 'Traffic barriers and caution tape installed',
    },
  ],
  improvementOpportunities: [
    {
      value:
        'Staging area setup should be completed earlier to improve traffic flow and equipment access.',
      title: 'Staging area setup should be improved',
    },
    {
      value:
        'Communication handover between initial responders and incoming teams should be standardised.',
      title: 'Communication handover should be standardised',
    },
    {
      value:
        'Access control at the incident perimeter should be enforced earlier to reduce crowding.',
      title: 'Perimeter access control should be tightened',
    },
    {
      value:
        'Equipment readiness checks should be completed at shift start to reduce deployment delays.',
      title: 'Shift-start equipment checks should be tightened',
    },
    {
      value:
        'A clearer casualty triage and treatment zone should be established at the start of response.',
      title: 'Casualty triage zone should be established earlier',
    },
    {
      value:
        'Radio discipline should be improved by using shorter and more structured status messages.',
      title: 'Radio message discipline should be improved',
    },
    {
      value: 'Role assignment and command briefing should be documented immediately on arrival.',
      title: 'Initial role assignment should be documented earlier',
    },
    {
      value:
        'Scene hazard assessment should be repeated at fixed intervals during prolonged operations.',
      title: 'Periodic hazard reassessment should be enforced',
    },
    {
      value:
        'Mutual aid activation criteria should be clarified to prevent late escalation requests.',
      title: 'Mutual aid escalation criteria should be clarified',
    },
    {
      value:
        'A dedicated logistics runner should be assigned to reduce interruptions to frontline teams.',
      title: 'Dedicated logistics support should be assigned',
    },
    {
      value:
        'Post-incident debrief should be conducted within the same shift to capture lessons accurately.',
      title: 'Same-shift debrief should be standard practice',
    },
  ],
}

export const SECTION_META = {
  strengths: {
    title: 'Strengths',
    addLabel: 'Add strength',
    modalTitle: 'Add Strength',
    editLabel: 'Edit Strengths',
    visibleLimit: 3,
  },
  resourcesMobilised: {
    title: 'Resources, Equipment & Consumables Mobilised',
    addLabel: 'Add resource',
    modalTitle: 'Add Resource',
    editLabel: 'Edit Resources',
    visibleLimit: 6,
    showMoreText: 'View all resources',
    showLessText: 'Show fewer resources',
  },
  improvementOpportunities: {
    title: 'Improvement Opportunities',
    addLabel: 'Add improvement',
    modalTitle: 'Add Improvement',
    editLabel: 'Edit Improvements',
    visibleLimit: 3,
  },
}

export const normalizeSection = (value) => {
  const fallback = defaultPostIncidentAnalysis()
  const safe = value && typeof value === 'object' ? value : {}
  const normalizeRows = (rows) =>
    (Array.isArray(rows) ? rows : []).map((item) => String(item || '').trim()).filter(Boolean)

  return {
    strengths: normalizeRows(safe.strengths ?? fallback.strengths),
    resourcesMobilised: normalizeRows(safe.resourcesMobilised ?? fallback.resourcesMobilised),
    improvementOpportunities: normalizeRows(
      safe.improvementOpportunities ?? fallback.improvementOpportunities,
    ),
    photos: (Array.isArray(safe.photos) ? safe.photos : []).filter(Boolean),
  }
}

export const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const buildInitialOptionsBySection = () => ({
  strengths: (PRESET_OPTIONS.strengths || []).map((row) => ({ ...row })),
  resourcesMobilised: (PRESET_OPTIONS.resourcesMobilised || []).map((row) => ({ ...row })),
  improvementOpportunities: (PRESET_OPTIONS.improvementOpportunities || []).map((row) => ({
    ...row,
  })),
})
