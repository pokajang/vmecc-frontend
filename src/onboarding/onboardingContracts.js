import { SUPPORTED_ONBOARDING_LOCALES } from 'src/onboarding/onboardingPreferenceDefinitions'
import { logOnboardingDebug } from 'src/onboarding/onboardingState'

const TOUR_PROMPT_COPY_FIELDS = [
  'title',
  'body',
  'preparingTitle',
  'preparingBody',
  'notReadyTitle',
  'notReadyBody',
  'startLabel',
  'retryLabel',
  'skipLabel',
]

const TUTORIAL_ACTION_TYPES = ['start', 'navigate', 'disabled']
const TUTORIAL_STATUSES = ['ready', 'coming_soon', 'hidden', 'blocked']

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = (value) => String(value || '').trim().length > 0
const isRegExp = (value) => Object.prototype.toString.call(value) === '[object RegExp]'

const shouldThrowOnInvalidContract = () =>
  Boolean(import.meta?.env?.DEV || import.meta?.env?.MODE === 'test')

const onboardingContractError = (message) => new Error(`[onboarding-contract] ${message}`)

const assertNonEmptyString = (value, label) => {
  if (!isNonEmptyString(value)) {
    throw onboardingContractError(`${label} must be a non-empty string`)
  }
}

const assertOptionalString = (value, label) => {
  if (value == null) return
  assertNonEmptyString(value, label)
}

const assertOptionalBoolean = (value, label) => {
  if (value == null) return
  if (typeof value !== 'boolean') {
    throw onboardingContractError(`${label} must be a boolean`)
  }
}

const assertFunction = (value, label) => {
  if (typeof value !== 'function') {
    throw onboardingContractError(`${label} must be a function`)
  }
}

const assertRegExp = (value, label) => {
  if (!isRegExp(value)) {
    throw onboardingContractError(`${label} must be a regular expression`)
  }
}

const assertOptionalRegExp = (value, label) => {
  if (value == null) return
  assertRegExp(value, label)
}

const assertOptionalLocalizedCopy = (value, label, options) => {
  if (value == null) return
  assertValidLocalizedCopy(value, label, options)
}

export const isLocalizedOnboardingCopy = (value) =>
  isPlainObject(value) &&
  (Object.prototype.hasOwnProperty.call(value, 'en') ||
    Object.prototype.hasOwnProperty.call(value, 'bm'))

export const assertValidLocalizedCopy = (value, label, { allowString = true } = {}) => {
  if (allowString && isNonEmptyString(value)) return true

  if (!isLocalizedOnboardingCopy(value)) {
    throw onboardingContractError(`${label} must be a localized copy object or string`)
  }

  const hasSupportedLocale = SUPPORTED_ONBOARDING_LOCALES.some((locale) =>
    Object.prototype.hasOwnProperty.call(value, locale),
  )

  if (!hasSupportedLocale) {
    throw onboardingContractError(
      `${label} must declare at least one supported locale: ${SUPPORTED_ONBOARDING_LOCALES.join(', ')}`,
    )
  }

  for (const locale of SUPPORTED_ONBOARDING_LOCALES) {
    const localizedValue = value?.[locale]
    if (localizedValue == null) continue

    if (typeof localizedValue !== 'string') {
      throw onboardingContractError(`${label}.${locale} must be a string`)
    }
  }

  return true
}

export const assertValidTourStep = (step, label = 'tour step') => {
  if (!isPlainObject(step)) {
    throw onboardingContractError(`${label} must be an object`)
  }

  assertNonEmptyString(step.key, `${label}.key`)
  assertValidLocalizedCopy(step.title, `${label}.title`)
  assertValidLocalizedCopy(step.content, `${label}.content`)
  assertNonEmptyString(step.targetSelector, `${label}.targetSelector`)
  assertOptionalString(step.fallbackSelector, `${label}.fallbackSelector`)
  assertOptionalString(step.placement, `${label}.placement`)
  assertOptionalString(step.mobilePlacement, `${label}.mobilePlacement`)
  assertOptionalLocalizedCopy(step.primaryActionLabel, `${label}.primaryActionLabel`)
  assertOptionalString(step.primaryActionRoute, `${label}.primaryActionRoute`)
  assertOptionalString(step.primaryActionTargetSelector, `${label}.primaryActionTargetSelector`)
  assertOptionalString(step.primaryActionWaitForSelector, `${label}.primaryActionWaitForSelector`)
  assertOptionalString(step.primaryActionStartAtStepKey, `${label}.primaryActionStartAtStepKey`)
  assertOptionalRegExp(step.routePattern, `${label}.routePattern`)
  assertOptionalBoolean(step.allowOffscreenTarget, `${label}.allowOffscreenTarget`)

  return true
}

export const assertValidPromptCopy = (copy, label = 'tour prompt') => {
  if (!isPlainObject(copy)) {
    throw onboardingContractError(`${label} must be an object`)
  }

  for (const field of TOUR_PROMPT_COPY_FIELDS) {
    assertValidLocalizedCopy(copy[field], `${label}.${field}`)
  }

  return true
}

export const assertValidTourConfig = (config, label = 'tour config') => {
  if (!isPlainObject(config)) {
    throw onboardingContractError(`${label} must be an object`)
  }

  assertNonEmptyString(config.id, `${label}.id`)
  assertNonEmptyString(config.moduleId, `${label}.moduleId`)
  assertNonEmptyString(config.key, `${label}.key`)
  assertNonEmptyString(config.version, `${label}.version`)
  assertNonEmptyString(config.route, `${label}.route`)
  assertRegExp(config.routePattern, `${label}.routePattern`)
  assertOptionalRegExp(config.promptRoutePattern, `${label}.promptRoutePattern`)
  assertOptionalRegExp(config.replayRoutePattern, `${label}.replayRoutePattern`)
  assertNonEmptyString(config.requestEvent, `${label}.requestEvent`)
  assertNonEmptyString(config.replayEvent, `${label}.replayEvent`)
  assertFunction(config.canLaunch || config.eligibility, `${label}.canLaunch`)
  assertFunction(config.suppression, `${label}.suppression`)

  if (!isPlainObject(config.selectors)) {
    throw onboardingContractError(`${label}.selectors must be an object`)
  }

  assertNonEmptyString(config.selectors.module, `${label}.selectors.module`)

  if (!Array.isArray(config.selectors.anchors) || config.selectors.anchors.length === 0) {
    throw onboardingContractError(`${label}.selectors.anchors must be a non-empty array`)
  }

  config.selectors.anchors.forEach((selector, index) => {
    assertNonEmptyString(selector, `${label}.selectors.anchors[${index}]`)
  })

  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    throw onboardingContractError(`${label}.steps must be a non-empty array`)
  }

  config.steps.forEach((step, index) => {
    assertValidTourStep(step, `${label}.steps[${index}]`)
  })

  assertValidPromptCopy(config.prompt, `${label}.prompt`)

  if (!isPlainObject(config.sourceDefaults)) {
    throw onboardingContractError(`${label}.sourceDefaults must be an object`)
  }

  ;['prompt', 'request', 'replay', 'tutorialHub'].forEach((field) => {
    assertNonEmptyString(config.sourceDefaults[field], `${label}.sourceDefaults.${field}`)
  })

  if (config.localized != null && typeof config.localized !== 'boolean') {
    throw onboardingContractError(`${label}.localized must be a boolean when provided`)
  }

  if (config.localized === true) {
    const hasLocalizedPrompt = TOUR_PROMPT_COPY_FIELDS.some((field) =>
      isLocalizedOnboardingCopy(config.prompt?.[field]),
    )
    if (!hasLocalizedPrompt) {
      throw onboardingContractError(`${label}.localized=true requires localized prompt copy`)
    }
  }

  return true
}

export const assertValidTutorialRegistryEntry = (entry, label = 'tutorial registry entry') => {
  if (!isPlainObject(entry)) {
    throw onboardingContractError(`${label} must be an object`)
  }

  assertNonEmptyString(entry.moduleId, `${label}.moduleId`)
  assertValidLocalizedCopy(entry.label, `${label}.label`)
  assertValidLocalizedCopy(entry.description, `${label}.description`)
  assertNonEmptyString(entry.route, `${label}.route`)
  assertOptionalString(entry.icon, `${label}.icon`)

  if (entry.visible != null) {
    assertFunction(entry.visible, `${label}.visible`)
  }

  if (entry.resolveHubState != null) {
    assertFunction(entry.resolveHubState, `${label}.resolveHubState`)
  }

  if (entry.localized != null && typeof entry.localized !== 'boolean') {
    throw onboardingContractError(`${label}.localized must be a boolean when provided`)
  }

  if (entry.localized === true) {
    const hasLocalizedField = [entry.label, entry.description, entry.actionLabel].some(
      isLocalizedOnboardingCopy,
    )

    if (!hasLocalizedField) {
      throw onboardingContractError(`${label}.localized=true requires localized display copy`)
    }
  }

  if (entry.tourConfig != null) {
    assertValidTourConfig(entry.tourConfig, `${label}.tourConfig`)
  }

  return true
}

export const assertValidTutorialHubItem = (item, label = 'tutorial hub item') => {
  if (!isPlainObject(item)) {
    throw onboardingContractError(`${label} must be an object`)
  }

  assertNonEmptyString(item.moduleId, `${label}.moduleId`)
  assertValidLocalizedCopy(item.label, `${label}.label`)
  assertValidLocalizedCopy(item.description, `${label}.description`)

  if (!TUTORIAL_STATUSES.includes(item.status)) {
    throw onboardingContractError(`${label}.status must be one of: ${TUTORIAL_STATUSES.join(', ')}`)
  }

  if (!TUTORIAL_ACTION_TYPES.includes(item.actionType)) {
    throw onboardingContractError(
      `${label}.actionType must be one of: ${TUTORIAL_ACTION_TYPES.join(', ')}`,
    )
  }

  if (item.actionLabel != null) {
    assertValidLocalizedCopy(item.actionLabel, `${label}.actionLabel`)
  }

  assertOptionalString(item.statusLabel, `${label}.statusLabel`)
  assertOptionalString(item.source, `${label}.source`)
  assertOptionalString(item.replayEvent, `${label}.replayEvent`)

  if (item.actionType === 'navigate') {
    assertNonEmptyString(item.actionTo, `${label}.actionTo`)
  }

  if (item.actionType === 'start') {
    assertNonEmptyString(item.replayEvent, `${label}.replayEvent`)
  }

  if (item.localized != null && typeof item.localized !== 'boolean') {
    throw onboardingContractError(`${label}.localized must be a boolean when provided`)
  }

  if (item.localized === true) {
    const hasLocalizedField = [item.label, item.description, item.actionLabel].some(
      isLocalizedOnboardingCopy,
    )

    if (!hasLocalizedField) {
      throw onboardingContractError(`${label}.localized=true requires localized display copy`)
    }
  }

  return true
}

const reportContractIssue = (scope, error) => {
  logOnboardingDebug('contract invalid', {
    message: error?.message,
    scope,
  })
}

export const validateOnboardingContract = (validator, value, scope) => {
  try {
    validator(value, scope)
    return true
  } catch (error) {
    reportContractIssue(scope, error)
    if (shouldThrowOnInvalidContract()) {
      throw error
    }
    return false
  }
}
