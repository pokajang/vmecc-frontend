import React, { createRef } from 'react'
import { INSPECTION_TYPE_DEFINITIONS } from '../app/inspectionTypeRegistry'
import {
  CONTINUATION_LABELS,
  PARTIAL_STATE_PROMPTS,
  getContinuationLabel,
} from '../inspectionFormUiTokens'

const noop = () => {}

export const INSPECTION_BODY_STATES = [
  'empty',
  'partial',
  'missing-required',
  'complete-with-next-location',
]

export const INSPECTION_BODY_VIEWPORTS = ['desktop', 'mobile']

export const NEXT_LABELS = Object.values(CONTINUATION_LABELS)

export const UI_CLASSES = {
  actions: 'inspection-form-actions',
  inlineActions: 'inspection-form-inline-actions',
  inlineActionSpacer: 'inspection-form-inline-actions-spacer',
  nextLocationCard: 'inspection-next-location-card',
  nextLocationOptions: 'inspection-next-location-options',
}

export const EVIDENCE_CLASSES = [
  'inspection-general-evidence-card',
  'inspection-general-evidence-mobile-compact',
]

const StructuredSectionStub = ({ children }) => (
  <div data-testid="structured-section">{children}</div>
)

const createRefBundle = () => ({
  descriptionRef: createRef(),
  photosRef: createRef(),
  structuredSectionRef: createRef(),
  uploadInputRef: createRef(),
  cameraInputRef: createRef(),
})

const buildContinuation = ({
  label = 'location',
  scope = 'mainLocation',
  currentValue = '',
  nextValue = '',
  currentComplete = true,
  showProgress = true,
}) => ({
  scope,
  label,
  currentValue,
  options: [
    {
      value: currentValue,
      title: currentValue,
      ...(showProgress
        ? {
            progress: {
              isDone: currentComplete,
              inspectedCount: currentComplete ? 2 : 1,
              totalCount: 2,
            },
            metaLabel: '2 checks',
            metaTone: 'muted',
          }
        : {}),
    },
    {
      value: nextValue,
      title: nextValue,
      ...(showProgress
        ? {
            progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
            metaLabel: '2 checks',
            metaTone: 'muted',
          }
        : {}),
    },
  ],
})

const typeRegistry = {
  'er-aux': {
    key: 'er-aux-equipment-inspection',
    mainLocation: 'Store',
    continuation: { label: 'location', scope: 'mainLocation', current: 'Store', next: 'Office' },
    hasSharedContinuation: true,
    partialPrompt: null,
  },
  'fire-extinguisher': {
    key: 'fire-extinguisher-inspection',
    mainLocation: 'Manjung Hub',
    continuation: {
      label: 'location',
      scope: 'subLocation',
      current: 'Reception',
      next: 'Cafeteria',
    },
    hasSharedContinuation: true,
    partialPrompt: PARTIAL_STATE_PROMPTS.fireExtinguisherFlow,
  },
  'frt-daily': {
    key: 'frt-daily-inspection',
    mainLocation: 'FIRE TRUCK',
    continuation: {
      label: 'compartment',
      scope: 'subLocation',
      current: 'LOCKER 01',
      next: 'LOCKER 02',
    },
    hasSharedContinuation: true,
    partialPrompt: PARTIAL_STATE_PROMPTS.fireTruckFlow,
  },
  hydraulic: {
    key: 'hydraulic-rescue-tools-inspection',
    mainLocation: 'Hydraulic Bay',
    continuation: {
      label: 'location',
      scope: 'mainLocation',
      current: 'Hydraulic Bay',
      next: 'Pump House',
    },
    hasSharedContinuation: true,
    partialPrompt: null,
  },
  scba: {
    key: 'scba-inspection',
    mainLocation: 'Air Supply Annex',
    continuation: {
      label: 'location',
      scope: 'mainLocation',
      current: 'Air Supply Annex',
      next: 'Breathing Air Room',
    },
    hasSharedContinuation: true,
    partialPrompt: null,
  },
  highAngle: {
    key: 'high-angle-rescue-equipment-inspection',
    mainLocation: 'Response Kit #1',
    continuation: {
      label: 'kit',
      scope: 'mainLocation',
      current: 'Response Kit #1',
      next: 'Response Kit #2',
    },
    hasSharedContinuation: true,
    partialPrompt: null,
  },
  general: {
    key: 'general-inspection',
    mainLocation: 'Manjung Hub',
    hasSharedContinuation: false,
    partialPrompt: PARTIAL_STATE_PROMPTS.locationFlow,
  },
  hse: {
    key: 'health-safety-environment-inspection',
    mainLocation: 'Manjung Hub',
    hasSharedContinuation: false,
    partialPrompt: PARTIAL_STATE_PROMPTS.locationFlow,
  },
}

const resolveTypeConfig = (definition) =>
  typeRegistry[
    definition.key === 'er-aux-equipment-inspection'
      ? 'er-aux'
      : definition.key === 'fire-extinguisher-inspection'
        ? 'fire-extinguisher'
        : definition.key === 'frt-daily-inspection'
          ? 'frt-daily'
          : definition.key === 'hydraulic-rescue-tools-inspection'
            ? 'hydraulic'
            : definition.key === 'scba-inspection'
              ? 'scba'
              : definition.key === 'high-angle-rescue-equipment-inspection'
                ? 'highAngle'
                : definition.key === 'general-inspection'
                  ? 'general'
                  : definition.key === 'health-safety-environment-inspection'
                    ? 'hse'
                    : definition.formMode === 'generic'
                      ? 'general'
                      : 'hydraulic'
  ]

const withPhoto = () => [{ id: 'sample-photo', url: 'data:image/png;base64,AA==' }]

const buildBaseProps = ({
  definition,
  refs,
  createMock,
  isStructured,
  isGeneral,
  isFireExtinguisher,
  isFireTruck,
  isZoneFlow,
}) => {
  const selectedFireTruckPlate = isFireTruck ? 'WGG 01' : ''

  return {
    appendDescription: createMock(),
    checklistChips: [],
    currentStructuredSummary: {},
    descriptionRef: refs.descriptionRef,
    draftStatus: '',
    fieldErrors: {},
    fireExtinguisherScan: {},
    isStructuredInspectionForm: isStructured,
    isFullInspectionForm: isGeneral,
    isFireExtinguisherCatalogInspectionForm: isFireExtinguisher,
    isFireTruckCatalogInspectionForm: isFireTruck,
    isLoadingEquipmentRows: false,
    isLoadingFireExtinguisherRows: false,
    isLoadingScbaCatalogSections: false,
    onRequestReview: createMock(),
    onRetryDraftSync: createMock(),
    onSaveDraft: createMock(),
    photosRef: refs.photosRef,
    removePhoto: createMock(),
    requestInspectionIssuePhotoUpload: createMock(),
    requestRootPhotoUpload: createMock(),
    selectedFireTruckPlate,
    selectedTypeDefinition: definition,
    selectedType: definition.inspectionType,
    showComingSoonNotice: false,
    structuredDisplayForm: {},
    structuredSectionHandlers: {},
    structuredSectionRef: refs.structuredSectionRef,
    StructuredEditSection: isStructured
      ? () => <StructuredSectionStub>{definition.inspectionType} section</StructuredSectionStub>
      : null,
    toggleChecklistChip: createMock(),
    updateForm: createMock(),
    updatePhotoDescription: createMock(),
    uploadInputRef: refs.uploadInputRef,
    cameraInputRef: refs.cameraInputRef,
    validationState: null,
    validationStatusMessage: '',
    zone: isZoneFlow ? '1' : '',
  }
}

const finalizeProps = (props) => ({
  ...props,
  getLatestForm: () => ({
    inspectionType: props.form?.inspectionType,
    photos: props.form?.photos || [],
  }),
})

export const buildInspectionBodyCase = (
  definition,
  state,
  { createMock = () => noop, refs = createRefBundle() } = {},
) => {
  const config = resolveTypeConfig(definition)
  const isStructured = definition.formMode === 'structured'
  const isFireExtinguisher = definition.key === 'fire-extinguisher-inspection'
  const isFireTruck = definition.key === 'frt-daily-inspection'
  const isGeneral = definition.formMode === 'generic'
  const isZoneFlow = Boolean(definition.usesZoneLocationFlow)
  const onSelectNextScope = createMock()
  const baseProps = buildBaseProps({
    definition,
    refs,
    createMock,
    isStructured,
    isGeneral,
    isFireExtinguisher,
    isFireTruck,
    isZoneFlow,
  })

  if (state === 'empty') {
    return {
      props: finalizeProps({
        ...baseProps,
        form: {
          inspectionType: definition.inspectionType,
          photos: [],
          ...(isFireExtinguisher ? { zone: '1', mainLocation: '', subLocation: '' } : {}),
          ...(isGeneral ? { zone: '1', mainLocation: '', subLocation: '' } : {}),
          ...(definition.key === 'health-safety-environment-inspection'
            ? { zone: '1', mainLocation: '', subLocation: '' }
            : {}),
          ...(isFireTruck ? { mainLocation: '' } : {}),
        },
        location: { selectedMainLocationTitle: '', subLocationOptions: [] },
        mainLocation: '',
      }),
      expectation: {
        hasNextLocation: false,
        hasActions: false,
        promptText: null,
        shouldHaveOrder: false,
      },
      onSelectNextScope,
    }
  }

  if (state === 'partial') {
    if (isFireExtinguisher) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            zone: '1',
            mainLocation: config.mainLocation,
            subLocation: '',
            photos: [],
            fireExtinguisherEntryMode: '',
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
          },
          zone: '1',
          currentStructuredSummary: {},
        }),
        expectation: {
          hasNextLocation: false,
          hasActions: false,
          promptText: config.partialPrompt,
          shouldHaveOrder: false,
        },
        onSelectNextScope,
      }
    }

    if (isFireTruck) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            mainLocation: config.mainLocation,
            subLocation: '',
            photos: [],
            frtShift: '',
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [{ value: 'LOCKER 01', title: 'LOCKER 01' }],
          },
          zone: '',
          currentStructuredSummary: {},
        }),
        expectation: {
          hasNextLocation: false,
          hasActions: false,
          promptText: config.partialPrompt,
          shouldHaveOrder: false,
        },
        onSelectNextScope,
      }
    }

    if (isGeneral) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            zone: '1',
            mainLocation: config.mainLocation,
            subLocation: '',
            photos: [],
            inspectionIssues: [],
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
          },
          zone: '1',
        }),
        expectation: {
          hasNextLocation: false,
          hasActions: false,
          promptText: config.partialPrompt,
          shouldHaveOrder: false,
        },
        onSelectNextScope,
      }
    }

    if (definition.key === 'health-safety-environment-inspection') {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            zone: '1',
            mainLocation: config.mainLocation,
            subLocation: '',
            photos: [],
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
          },
          zone: '1',
        }),
        expectation: {
          hasNextLocation: false,
          hasActions: false,
          promptText: config.partialPrompt,
          shouldHaveOrder: false,
        },
        onSelectNextScope,
      }
    }

    return {
      props: finalizeProps({
        ...baseProps,
        form: {
          inspectionType: definition.inspectionType,
          mainLocation: config.mainLocation,
          photos: [],
        },
        mainLocation: config.mainLocation,
        location: {
          selectedMainLocationTitle: config.mainLocation,
          subLocationOptions: [],
        },
        currentStructuredSummary: {},
      }),
      expectation: {
        hasNextLocation: false,
        hasActions: true,
        promptText: null,
        shouldHaveOrder: false,
      },
      onSelectNextScope,
    }
  }

  if (state === 'missing-required' || state === 'complete-with-next-location') {
    const shouldHavePhotos = state === 'complete-with-next-location'
    const isMissingRequired = state === 'missing-required'
    const continuation = config.hasSharedContinuation
      ? buildContinuation({
          label: config.continuation.label,
          scope: config.continuation.scope,
          currentValue: config.continuation.current,
          nextValue: config.continuation.next,
          currentComplete: !isMissingRequired,
          showProgress: !isFireExtinguisher,
        })
      : null

    if (isFireExtinguisher) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            zone: '1',
            mainLocation: config.mainLocation,
            subLocation: config.continuation.current,
            photos: shouldHavePhotos ? withPhoto() : [],
            fireExtinguisherEntryMode: '',
          },
          currentStructuredSummary: {
            totalCount: 2,
            completedCount: isMissingRequired ? 1 : 2,
            visibleChecks: [{ id: 'fe:1' }, { id: 'fe:2' }],
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [
              { value: config.continuation.current, title: config.continuation.current },
            ],
          },
          structuredSectionHandlers: {
            onSelectNextScope,
            scopeContinuation: continuation,
          },
          zone: '1',
        }),
        expectation: {
          hasNextLocation: !isMissingRequired && config.hasSharedContinuation,
          hasActions: true,
          continuationLabel: isMissingRequired
            ? null
            : getContinuationLabel(config.continuation.label),
          promptText: null,
          shouldHaveOrder: config.hasSharedContinuation,
          continuationNextValue: isMissingRequired ? null : config.continuation.next,
          canSelectNext: !isMissingRequired && config.hasSharedContinuation,
        },
        onSelectNextScope,
      }
    }

    if (isFireTruck) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            mainLocation: config.mainLocation,
            subLocation: config.continuation.current,
            photos: shouldHavePhotos ? withPhoto() : [],
            frtShift: '',
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [
              { value: config.continuation.current, title: config.continuation.current },
              { value: config.continuation.next, title: config.continuation.next },
            ],
          },
          structuredSectionHandlers: {
            onSelectNextScope,
            scopeContinuation: continuation,
          },
          zone: '',
        }),
        expectation: {
          hasNextLocation: !isMissingRequired,
          hasActions: true,
          continuationLabel: isMissingRequired
            ? null
            : getContinuationLabel(config.continuation.label),
          promptText: null,
          shouldHaveOrder: true,
          continuationNextValue: isMissingRequired ? null : config.continuation.next,
          canSelectNext: !isMissingRequired,
        },
        onSelectNextScope,
      }
    }

    if (
      definition.key === 'health-safety-environment-inspection' ||
      definition.key === 'general-inspection'
    ) {
      return {
        props: finalizeProps({
          ...baseProps,
          form: {
            inspectionType: definition.inspectionType,
            zone: '1',
            mainLocation: config.mainLocation,
            subLocation: 'Reception',
            photos: shouldHavePhotos ? withPhoto() : [],
            inspectionIssues: [],
          },
          mainLocation: config.mainLocation,
          location: {
            selectedMainLocationTitle: config.mainLocation,
            subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
          },
          zone: '1',
          structuredSectionHandlers: {},
        }),
        expectation: {
          hasNextLocation: false,
          hasActions: true,
          promptText: null,
          shouldHaveOrder: false,
        },
        onSelectNextScope,
      }
    }

    return {
      props: finalizeProps({
        ...baseProps,
        form: {
          inspectionType: definition.inspectionType,
          mainLocation: config.mainLocation,
          photos: shouldHavePhotos ? withPhoto() : [],
        },
        mainLocation: config.mainLocation,
        location: {
          selectedMainLocationTitle: config.mainLocation,
          subLocationOptions: [
            { value: config.continuation.current, title: config.continuation.current },
            { value: config.continuation.next, title: config.continuation.next },
          ],
        },
        structuredSectionHandlers: {
          onSelectNextScope,
          scopeContinuation: continuation,
        },
        zone: isZoneFlow ? '1' : '',
      }),
      expectation: {
        hasNextLocation: !isMissingRequired,
        hasActions: true,
        continuationLabel: isMissingRequired
          ? null
          : getContinuationLabel(config.continuation.label),
        promptText: null,
        shouldHaveOrder: true,
        continuationNextValue: isMissingRequired ? null : config.continuation.next,
        canSelectNext: !isMissingRequired,
      },
      onSelectNextScope,
    }
  }

  return {
    props: finalizeProps({
      ...baseProps,
      form: {
        inspectionType: definition.inspectionType,
        photos: withPhoto(),
      },
    }),
    expectation: {
      hasNextLocation: false,
      hasActions: false,
      promptText: null,
      shouldHaveOrder: false,
    },
    onSelectNextScope,
  }
}

export const buildInspectionBodyMatrix = ({ includeViewports = true } = {}) =>
  INSPECTION_TYPE_DEFINITIONS.flatMap((definition) =>
    INSPECTION_BODY_STATES.flatMap((state) =>
      includeViewports
        ? INSPECTION_BODY_VIEWPORTS.map((viewport) => ({
            definition,
            state,
            viewport,
          }))
        : [{ definition, state }],
    ),
  )

export const getInspectionBodyStateLabel = (state) =>
  state === 'complete-with-next-location'
    ? 'Section complete with next location'
    : String(state || '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
