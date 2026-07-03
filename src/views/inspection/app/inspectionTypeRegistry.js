import generalInspectionDefinition from '../types/general/definition'
import erAuxInspectionDefinition from '../types/er-aux/definition'
import fireExtinguisherInspectionDefinition from '../types/fire-extinguisher/definition'
import frtDailyInspectionDefinition from '../types/frt-daily/definition'
import hydraulicInspectionDefinition from '../types/hydraulic/definition'
import scbaInspectionDefinition from '../types/scba/definition'
import highAngleInspectionDefinition from '../types/high-angle/definition'
import hseInspectionDefinition from '../types/hse/definition'
import { FRT_DAILY_LEGACY_INSPECTION_TYPE } from '../types/frt-daily/helpers'

export const INSPECTION_TYPE_DEFINITIONS = [
  erAuxInspectionDefinition,
  fireExtinguisherInspectionDefinition,
  frtDailyInspectionDefinition,
  highAngleInspectionDefinition,
  hydraulicInspectionDefinition,
  scbaInspectionDefinition,
  hseInspectionDefinition,
  generalInspectionDefinition,
]

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const byInspectionType = new Map(
  INSPECTION_TYPE_DEFINITIONS.map((definition) => [
    normalizeKey(definition.inspectionType),
    definition,
  ]),
)
byInspectionType.set(normalizeKey(FRT_DAILY_LEGACY_INSPECTION_TYPE), frtDailyInspectionDefinition)

export const getInspectionTypeDefinition = (inspectionType) =>
  byInspectionType.get(normalizeKey(inspectionType)) || null

export const getInspectionTypeOptions = () =>
  INSPECTION_TYPE_DEFINITIONS.map((definition) => ({
    value: definition.inspectionType,
    title: definition.title,
    description: definition.description,
    iconKey: definition.iconKey,
    icon: definition.icon,
    implemented: definition.implemented === true,
  }))

export const getInspectionTypeInitialFormState = () =>
  INSPECTION_TYPE_DEFINITIONS.reduce(
    (next, definition) => ({
      ...next,
      ...(definition.initialFormState || {}),
    }),
    {},
  )

export const getImplementedInspectionTypeDefinitions = () =>
  INSPECTION_TYPE_DEFINITIONS.filter((definition) => definition.implemented === true)
