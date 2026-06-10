// =============================================================================
// DUMMY IMPLEMENTATION — all AI responses below are fabricated placeholder data.
// Replace analyzeInspectionPhoto() with a real API call when the backend endpoint
// POST /api/inspection/analyze-photo is available.
// =============================================================================

const DUMMY_POOL = [
  {
    detectedType: 'Fire Water Pump House Inspection',
    confidence: 'high',
    suggestedLocations: ['Zone 2'],
    descriptions: [
      {
        angle: 'condition',
        options: [
          'Jockey pumps 1 & 2 in auto mode. Pipeline pressure within normal range. No visible leakage at pump house connections or pipelines.',
          'Fire pump house operational. All pressure indicators within acceptable limits. No structural issues or leakage observed.',
        ],
      },
      {
        angle: 'action',
        options: [
          'Conducted routine fire water pump house check. Verified pressure gauges, valve positions, and visual pipeline integrity.',
          'Performed scheduled pump house inspection. Confirmed pump modes, checked for leakage, and verified pipeline pressure readings.',
        ],
      },
      {
        angle: 'finding',
        options: [
          'No abnormalities detected. Pump house in serviceable condition. No immediate corrective action required.',
          'Inspection completed with no defects found. Equipment operationally ready and cleared for continued use.',
        ],
      },
    ],
    secondaryFindings: [
      {
        type: 'Housekeeping / 5S Inspection',
        note: 'Minor debris observed near pump house entrance.',
      },
    ],
  },
  {
    detectedType: 'Fire Extinguisher Monthly Inspection',
    confidence: 'high',
    suggestedLocations: ['Zone 1'],
    descriptions: [
      {
        angle: 'condition',
        options: [
          'Pressure gauge in green zone. Safety pin intact. No visible corrosion or physical damage on cylinder body.',
          'Extinguisher cylinder in good condition. Pressure indicator normal. Safety seal and pin undisturbed.',
        ],
      },
      {
        angle: 'action',
        options: [
          'Performed monthly fire extinguisher check. Inspected pressure indicator, safety pin, label, and cylinder condition.',
          'Carried out scheduled extinguisher inspection. Checked cylinder integrity, pressure level, label legibility, and mounting bracket.',
        ],
      },
      {
        angle: 'finding',
        options: [
          'Extinguisher serviceable and within valid inspection period. No defects found. Access clear and unobstructed.',
          'No issues identified. Extinguisher compliant and ready for use. No follow-up action required.',
        ],
      },
    ],
    secondaryFindings: [],
  },
  {
    detectedType: 'Site Patrol Observation',
    confidence: 'medium',
    suggestedLocations: ['Zone 3'],
    descriptions: [
      {
        angle: 'condition',
        options: [
          'Area conditions normal. No unauthorized activity or unusual hazards observed during patrol sweep. Perimeter secure.',
          'Site area within normal parameters. Access points secured. No anomalies detected during patrol.',
        ],
      },
      {
        angle: 'action',
        options: [
          'Completed scheduled site patrol. Checked activity, access controls, and visible hazard indicators across assigned area.',
          'Conducted perimeter and site sweep. Verified access control points, observed work activity, and assessed hazard conditions.',
        ],
      },
      {
        angle: 'finding',
        options: [
          'No reportable incidents identified. Site conditions within acceptable parameters at time of patrol.',
          'Patrol completed without incident. All observed conditions within normal operating range.',
        ],
      },
    ],
    secondaryFindings: [
      {
        type: 'Housekeeping / 5S Inspection',
        note: 'Waste materials not properly segregated near storage area.',
      },
    ],
  },
  {
    detectedType: 'Vehicle / ER Equipment Pre-Operational Inspection',
    confidence: 'high',
    suggestedLocations: ['Zone 1'],
    descriptions: [
      {
        angle: 'condition',
        options: [
          'Tires, lights, and fluid levels checked. No visible damage or abnormalities. Equipment ready for deployment.',
          'Vehicle exterior and critical systems inspected. No leaks, damage, or warning indicators observed.',
        ],
      },
      {
        angle: 'action',
        options: [
          'Pre-operational inspection completed. Verified fuel level, tire condition, emergency equipment, and communication devices.',
          'Performed full pre-shift vehicle check. Assessed brakes, lights, fluids, emergency kit, and radio communication.',
        ],
      },
      {
        angle: 'finding',
        options: [
          'Vehicle in good operational condition. All pre-start checklist items passed. Cleared for response readiness.',
          'No defects found. Vehicle meets pre-operational requirements and is ready for emergency deployment.',
        ],
      },
    ],
    secondaryFindings: [],
  },
  {
    detectedType: 'Housekeeping / 5S Inspection',
    confidence: 'medium',
    suggestedLocations: ['Zone 4'],
    descriptions: [
      {
        angle: 'condition',
        options: [
          'Workspace organization assessed. Designated storage zones partially compliant. Waste segregation bins present but not all labelled correctly.',
          'Work area reviewed against 5S criteria. General tidiness adequate. Minor non-compliance on labelling and bin placement.',
        ],
      },
      {
        angle: 'action',
        options: [
          'Conducted 5S housekeeping inspection. Reviewed sort, set-in-order, shine, standardize, and sustain criteria across work area.',
          'Carried out housekeeping walkthrough. Assessed storage discipline, cleanliness, and compliance with workplace organization standards.',
        ],
      },
      {
        angle: 'finding',
        options: [
          'Minor non-compliance noted on labelling and bin placement. Corrective action recommended before next inspection cycle.',
          'Area generally maintained but improvement needed on waste bin labelling. Follow-up inspection scheduled.',
        ],
      },
    ],
    secondaryFindings: [],
  },
]

let _callCount = 0

// DUMMY: cycles through pool to show variety across uploads.
// `_photoInput` supports either a single data URL string or an array of data URL strings.
// When wiring the real endpoint, pass { photo } for single or { photos } for multiple, plus location.
export const analyzeInspectionPhoto = async (_photoInput, _location = '') => {
  // DUMMY: simulates AI processing latency (~1.8s)
  await new Promise((r) => setTimeout(r, 1800))
  const result = DUMMY_POOL[_callCount % DUMMY_POOL.length]
  _callCount += 1
  return result
}

// Builds a synthetic analysis result for a promoted secondary finding.
// Used when the user taps "Add" on a secondary item — no new AI call needed.
export const buildSecondaryAnalysis = (secondary) => ({
  detectedType: secondary.type,
  confidence: 'medium',
  suggestedLocations: [],
  descriptions: [
    {
      angle: 'condition',
      options: [secondary.note, `Observed condition: ${secondary.note}`],
    },
    {
      angle: 'action',
      options: [
        `Investigated and documented: ${secondary.note}`,
        `Verified and recorded additional finding: ${secondary.note}`,
      ],
    },
    {
      angle: 'finding',
      options: [
        `Additional finding recorded: ${secondary.note}`,
        `Follow-up item noted: ${secondary.note}`,
      ],
    },
  ],
  secondaryFindings: [],
})
