import { hasPermission } from 'src/utils/authz'
import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

const escapeRouteSegment = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const createTourSourceDefaults = (modulePrefix) =>
  Object.freeze({
    prompt: `${modulePrefix}_prompt`,
    request: `${modulePrefix}_request`,
    replay: 'replay',
    tutorialHub: 'tutorial_hub',
  })

export const buildSharedReportRoutePattern = (reportSlug) => {
  const escapedSlug = escapeRouteSegment(reportSlug)
  return new RegExp(`^\\/report\\/${escapedSlug}(?:\\/new(?:\\/[^/]+)?|\\/[^/]+)?\\/?$`, 'i')
}

const buildSharedReportListRoutePattern = (reportSlug) => {
  const escapedSlug = escapeRouteSegment(reportSlug)
  return new RegExp(`^\\/report\\/${escapedSlug}\\/?$`, 'i')
}

const buildSharedReportFormRoutePattern = (reportSlug) => {
  const escapedSlug = escapeRouteSegment(reportSlug)
  return new RegExp(`^\\/report\\/${escapedSlug}\\/new(?:\\/(?!review\\/?$)[^/]+)?\\/?$`, 'i')
}

const buildSharedReportReviewRoutePattern = (reportSlug) => {
  const escapedSlug = escapeRouteSegment(reportSlug)
  return new RegExp(`^\\/report\\/${escapedSlug}\\/new\\/review\\/?$`, 'i')
}

const buildSharedReportDetailRoutePattern = (reportSlug) => {
  const escapedSlug = escapeRouteSegment(reportSlug)
  return new RegExp(`^\\/report\\/${escapedSlug}\\/(?!new(?:\\/|$))[^/]+\\/?$`, 'i')
}

export const getSharedReportTourStorageKey = (storagePrefix, userId) =>
  `${storagePrefix}:${userId || 'anonymous'}`

export const readSharedReportTourRecord = (storagePrefix, userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(
      localStorage.getItem(getSharedReportTourStorageKey(storagePrefix, userId)) || 'null',
    )
  } catch {
    return null
  }
}

export const writeSharedReportTourRecord = (storagePrefix, userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readSharedReportTourRecord(storagePrefix, userId) || {}
    localStorage.setItem(
      getSharedReportTourStorageKey(storagePrefix, userId),
      JSON.stringify({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Non-fatal. Tour state can be offered again if storage is unavailable.
  }
}

export const isSharedReportTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getSharedReportTourLaunchEligibility = (user, permission) => {
  const canViewReport = hasPermission(user, permission)

  return {
    canViewReport,
    eligible: canViewReport,
  }
}

export const getReplayOnlyTourPromptEligibility = (user, permission) => {
  const eligibility = getSharedReportTourLaunchEligibility(user, permission)

  return {
    ...eligibility,
    eligible: false,
  }
}

export const createSharedReportTourDefinition = ({
  detailLabel,
  mobileTypeLabel,
  moduleLabel,
  prefix,
  reportSlug,
  reviewLabel,
  supportsLocationManager = false,
  supportsTypeManager = false,
}) => {
  const listRoutePattern = buildSharedReportListRoutePattern(reportSlug)
  const formRoutePattern = buildSharedReportFormRoutePattern(reportSlug)
  const reviewRoutePattern = buildSharedReportReviewRoutePattern(reportSlug)
  const detailRoutePattern = buildSharedReportDetailRoutePattern(reportSlug)
  const moduleSelector = `[data-tour-id="${prefix}-module"]`
  const recordsSelector = `[data-tour-id="${prefix}-records"]`
  const filtersSelector = `[data-tour-id="${prefix}-filters"]`
  const newActionSelector = `[data-tour-id="${prefix}-new-action"]`
  const mobileTypeSelector = `[data-tour-id="${prefix}-mobile-type-selection"]`
  const draftResumeSelector = `[data-tour-id="${prefix}-draft-resume-action"]`
  const formSelector = `[data-tour-id="${prefix}-form"]`
  const reviewSelector = `[data-tour-id="${prefix}-review"]`
  const detailSelector = `[data-tour-id="${prefix}-detail"]`
  const editActionSelector = `[data-tour-id="${prefix}-edit-action"]`
  const deleteActionSelector = `[data-tour-id="${prefix}-delete-action"]`
  const deleteModalSelector = `[data-tour-id="${prefix}-delete-modal"]`
  const downloadActionSelector = `[data-tour-id="${prefix}-download-action"]`
  const typeManagerSelector = `[data-tour-id="${prefix}-type-manager-modal"]`
  const locationManagerSelector = `[data-tour-id="${prefix}-location-manager-modal"]`

  return {
    moduleSelector,
    anchorSelectors: [
      moduleSelector,
      recordsSelector,
      filtersSelector,
      newActionSelector,
      mobileTypeSelector,
      draftResumeSelector,
      formSelector,
      reviewSelector,
      detailSelector,
      editActionSelector,
      deleteActionSelector,
      deleteModalSelector,
      downloadActionSelector,
      typeManagerSelector,
      locationManagerSelector,
    ],
    steps: [
      {
        key: 'workspace',
        title: `${moduleLabel} workspace`,
        targetSelector: moduleSelector,
        content: `This workspace is where you review ${moduleLabel} records, continue draft work, and move into the report flow for this module.`,
        placement: 'center',
        mobilePlacement: 'center',
      },
      {
        key: 'typeSelection',
        title: mobileTypeLabel,
        targetSelector: mobileTypeSelector,
        routePattern: listRoutePattern,
        content: `Use this quick-start selector on mobile to choose the ${moduleLabel.toLowerCase()} type before the report form opens.`,
        placement: 'bottom',
        mobilePlacement: 'bottom',
      },
      {
        key: 'records',
        title: `${moduleLabel} records`,
        targetSelector: recordsSelector,
        routePattern: listRoutePattern,
        content: `Review submitted records and saved drafts here so you can reopen the ${moduleLabel.toLowerCase()} items that need attention.`,
        placement: 'auto',
        mobilePlacement: 'bottom',
      },
      {
        key: 'filters',
        title: 'Filters and scope',
        targetSelector: filtersSelector,
        fallbackSelector: recordsSelector,
        routePattern: listRoutePattern,
        content: `Use scope, search, sort, type, and status filters to narrow the visible ${moduleLabel.toLowerCase()} records before you open one.`,
        placement: 'bottom',
        mobilePlacement: 'bottom',
      },
      {
        key: 'newReport',
        title: `New ${moduleLabel} report`,
        targetSelector: newActionSelector,
        fallbackSelector: recordsSelector,
        routePattern: listRoutePattern,
        content: `Start a new ${moduleLabel.toLowerCase()} report here when you are ready to move into the form and review flow.`,
        placement: 'bottom',
        mobilePlacement: 'top',
        primaryActionLabel: 'Open report form',
        primaryActionTargetSelector: newActionSelector,
        primaryActionWaitForSelector: formSelector,
        primaryActionStartAtStepKey: 'form',
      },
      {
        key: 'draftResume',
        title: 'Resume saved draft',
        targetSelector: draftResumeSelector,
        fallbackSelector: recordsSelector,
        routePattern: listRoutePattern,
        content: `Open the saved draft action shell here when you need to resume ${moduleLabel.toLowerCase()} work without starting over.`,
        placement: 'bottom',
        mobilePlacement: 'top',
      },
      {
        key: 'form',
        title: 'Report form',
        targetSelector: formSelector,
        routePattern: formRoutePattern,
        content: `Use this form shell to prepare the ${moduleLabel.toLowerCase()} report details before you continue to review and submission.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      ...(supportsTypeManager
        ? [
            {
              key: 'typeManager',
              title: 'Type manager',
              targetSelector: typeManagerSelector,
              content: `This modal is where you maintain the reusable ${moduleLabel.toLowerCase()} type list before returning to the report flow.`,
              ...SAFE_MODAL_STEP_PLACEMENT,
            },
          ]
        : []),
      ...(supportsLocationManager
        ? [
            {
              key: 'locationManager',
              title: 'Location manager',
              targetSelector: locationManagerSelector,
              content: `Use this modal shell when drill locations need to be added or cleaned up before the report continues.`,
              ...SAFE_MODAL_STEP_PLACEMENT,
            },
          ]
        : []),
      {
        key: 'review',
        title: reviewLabel,
        targetSelector: reviewSelector,
        routePattern: reviewRoutePattern,
        content: `Use this review screen to confirm the ${moduleLabel.toLowerCase()} report details before you complete the workflow handoff.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      {
        key: 'detail',
        title: detailLabel,
        targetSelector: detailSelector,
        routePattern: detailRoutePattern,
        content: `Open any ${moduleLabel.toLowerCase()} detail view here to review the submitted record and its current status.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      {
        key: 'editAction',
        title: 'Edit action shell',
        targetSelector: editActionSelector,
        fallbackSelector: detailSelector,
        routePattern: detailRoutePattern,
        content: `Use this action shell to reopen an editable ${moduleLabel.toLowerCase()} record from detail when further updates are allowed.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      {
        key: 'downloadAction',
        title: 'Download action shell',
        targetSelector: downloadActionSelector,
        fallbackSelector: detailSelector,
        routePattern: detailRoutePattern,
        content: `Use this action shell to generate the current ${moduleLabel.toLowerCase()} PDF without changing the record state.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      {
        key: 'deleteAction',
        title: 'Delete action shell',
        targetSelector: deleteActionSelector,
        fallbackSelector: detailSelector,
        routePattern: detailRoutePattern,
        content: `This action shell is where draft or record deletion starts. The final confirm action remains outside the tour scope.`,
        placement: 'top',
        mobilePlacement: 'top',
      },
      {
        key: 'deleteModal',
        title: 'Delete modal shell',
        targetSelector: deleteModalSelector,
        routePattern: detailRoutePattern,
        content: `When deletion is opened, review the modal shell here and stop before the irreversible confirm action.`,
        ...SAFE_MODAL_STEP_PLACEMENT,
      },
    ],
  }
}
