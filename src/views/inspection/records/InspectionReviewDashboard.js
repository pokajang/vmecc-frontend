import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import { ReportPhotoImage } from 'src/components/report-workflow/ReportViewComponents'
import useMediaQuery from 'src/hooks/useMediaQuery'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { buildInspectionReviewDashboardItems } from './inspectionReviewDashboardAdapter'

const RETRYABLE_SYNC_BLOCKERS = new Set(['draft-sync-failed', 'fire-extinguisher-session-sync'])
const BACKGROUND_SYNC_BLOCKERS = new Set(['draft-sync-pending'])

const getRetryableSyncBlocker = (blockers = []) =>
  blockers.find((blocker) => RETRYABLE_SYNC_BLOCKERS.has(blocker?.key))

const getBackgroundSyncBlocker = (blockers = []) =>
  blockers.find((blocker) => BACKGROUND_SYNC_BLOCKERS.has(blocker?.key))

const getBlockingBlockers = (blockers = []) =>
  blockers.filter((blocker) => blocker?.nonBlocking !== true)

const getVisibleWarningBlocker = (blockers = []) =>
  blockers.find(
    (blocker) =>
      !BACKGROUND_SYNC_BLOCKERS.has(blocker?.key) && !RETRYABLE_SYNC_BLOCKERS.has(blocker?.key),
  )

const getIssueColor = (issueCount) => (issueCount > 0 ? 'warning' : 'success')

const toTitleCase = (value = '') => {
  const label = String(value || '').trim()
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : ''
}

const formatInspectionDate = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'Not set'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getSubmitTitle = (item = {}, isUpdateMode = false, mayQueue = false) => {
  const title = String(item.displayTitle || 'Inspection').trim()
  const action = mayQueue ? 'Queue' : isUpdateMode ? 'Update' : 'Submit'
  return `${action} ${/inspection$/i.test(title) ? title : `${title} Inspection`}?`
}

const InspectionReviewTypeCard = ({
  item,
  selected,
  isRetryingSync,
  isSubmitting,
  isUpdateMode = false,
  mayQueue = false,
  onViewDetails,
  onSubmit,
  onRetrySync,
}) => {
  const blockers = Array.isArray(item.blockers) ? item.blockers : []
  const canSubmit =
    (item.readiness?.isReadyToSubmit ?? getBlockingBlockers(blockers).length === 0) &&
    !isSubmitting &&
    !isRetryingSync
  const retryableSyncBlocker = getRetryableSyncBlocker(blockers)
  const backgroundSyncBlocker = getBackgroundSyncBlocker(blockers)
  const visibleWarningBlocker = getVisibleWarningBlocker(blockers)
  const retryCount = blockers.reduce(
    (total, blocker) => total + Math.max(0, Number(blocker?.retryCount || 0) || 0),
    0,
  )

  return (
    <div
      className={`inspection-review-type-card${selected ? ' inspection-review-type-card--selected' : ''}`}
    >
      <div className="inspection-review-type-card__layout">
        <div className="inspection-review-type-card__main">
          <div>
            <div className="inspection-review-type-card__title">{item.displayTitle}</div>
            <div className="inspection-review-type-card__meta">
              <div>{item.groupSummary}</div>
              <div>{item.itemSummary}</div>
            </div>
          </div>
          <div
            className={`inspection-review-type-card__issues text-${getIssueColor(item.metrics.issueCount)}`}
          >
            {item.issueSummary}
          </div>
          {visibleWarningBlocker?.message ? (
            <div className="text-warning-emphasis mt-2" role="alert">
              {visibleWarningBlocker.message}
            </div>
          ) : null}
        </div>
        <div className="inspection-review-type-card__actions">
          {retryableSyncBlocker ? (
            <CButton
              type="button"
              size="sm"
              color="warning"
              variant="outline"
              disabled={isRetryingSync}
              onClick={() => onRetrySync(item, retryableSyncBlocker)}
            >
              {isRetryingSync
                ? retryCount > 0
                  ? `Syncing 1 of ${retryCount}`
                  : 'Syncing...'
                : `Retry Sync${retryCount > 1 ? ` (${retryCount})` : ''}`}
            </CButton>
          ) : null}
          <CButton
            type="button"
            size="sm"
            color="primary"
            disabled={!canSubmit}
            onClick={() => onSubmit(item)}
          >
            {backgroundSyncBlocker
              ? backgroundSyncBlocker.message || 'Syncing...'
              : mayQueue
                ? isUpdateMode
                  ? 'Queue update'
                  : 'Queue for sync'
                : isUpdateMode
                  ? 'Update'
                  : 'Submit'}
          </CButton>
          <CButton
            type="button"
            size="sm"
            color="secondary"
            variant="outline"
            className="inspection-review-type-card__details-button"
            aria-haspopup="dialog"
            onClick={() => onViewDetails(item.key)}
          >
            View
          </CButton>
        </div>
      </div>
    </div>
  )
}

const InspectionReviewInlinePhotoGroups = ({ groups = [] }) => {
  if (!Array.isArray(groups) || groups.length === 0) return null

  return (
    <div className="inspection-review-photo-groups">
      {groups.map((group) => (
        <div className="inspection-review-photo-group" key={group.key}>
          <div className="inspection-review-photo-group__title">{group.title}</div>
          <div className="inspection-review-photo-group__grid">
            {group.photos.map((photo, index) => (
              <div className="inspection-review-photo-card" key={photo.key || index}>
                {photo.url ? (
                  <ReportPhotoImage
                    photo={photo}
                    className="inspection-review-photo-card__image"
                    alt={photo.description || photo.fileName || 'Inspection photo'}
                  />
                ) : null}
                {photo.fileName ? (
                  <div className="inspection-review-photo-card__name" title={photo.fileName}>
                    {photo.fileName}
                  </div>
                ) : null}
                {photo.description ? (
                  <div className="inspection-review-photo-card__description">
                    {photo.description}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const InspectionReviewLocationsList = ({ item }) => {
  const locationRows = item.locationRows || []
  const [expandedPhotoLocationKey, setExpandedPhotoLocationKey] = useState('')

  if (locationRows.length === 0) {
    return (
      <CAlert color="info" className="mb-0">
        No checked {item.labels?.groupPlural || 'locations'} are available for this inspection.
      </CAlert>
    )
  }

  return (
    <CListGroup className="inspection-review-detail-location-list">
      {locationRows.map((location, index) => {
        const photoCount = Number(location.photoCount || 0)
        const photosExpanded = expandedPhotoLocationKey === location.key

        return (
          <CListGroupItem
            className="inspection-review-detail-location-list__item"
            key={location.key}
          >
            <div className="inspection-review-detail-location-list__index">{index + 1}</div>
            <div className="inspection-review-detail-location-list__content">
              <div className="inspection-review-detail-location-list__path">
                {[location.zoneLabel, location.areaLabel || location.title, location.locationLabel]
                  .filter(Boolean)
                  .join(' > ')}
              </div>
              <div className="inspection-review-detail-location-list__count">
                {location.itemSummary}
              </div>
              {photoCount > 0 ? (
                <button
                  type="button"
                  className="inspection-review-photo-link"
                  aria-expanded={photosExpanded}
                  onClick={() =>
                    setExpandedPhotoLocationKey((current) =>
                      current === location.key ? '' : location.key,
                    )
                  }
                >
                  Inspection photos ({photoCount} total)
                </button>
              ) : null}
              {photosExpanded ? (
                <InspectionReviewInlinePhotoGroups groups={location.photoGroups} />
              ) : null}
            </div>
          </CListGroupItem>
        )
      })}
    </CListGroup>
  )
}

const InspectionReviewLocationContext = ({ group }) => (
  <div className="inspection-review-issue-group__location">
    {group.zoneLabel || group.subtitle ? (
      <div className="inspection-review-issue-group__zone">{group.zoneLabel || group.subtitle}</div>
    ) : null}
    <div className="inspection-review-issue-group__area">{group.areaLabel || group.title}</div>
    {group.hasDistinctLocation ? (
      <div className="inspection-review-issue-group__sub-location">{group.locationLabel}</div>
    ) : null}
  </div>
)

const InspectionReviewIssuesList = ({ item }) => {
  const issueGroups = item.issueGroups || []
  const issueCount = item.metrics?.issueCount || 0

  if (issueCount === 0 || issueGroups.length === 0) {
    return (
      <div className="inspection-review-no-issues">
        <div className="inspection-review-no-issues__title">No issues recorded</div>
        <div className="inspection-review-no-issues__text">
          All checked {item.labels?.itemPlural || 'items'} were recorded without issues.
        </div>
      </div>
    )
  }

  return (
    <div className="inspection-review-issue-list">
      {issueGroups.map((group) => (
        <div className="inspection-review-issue-group" key={group.key}>
          <div className="inspection-review-issue-group__header">
            <InspectionReviewLocationContext group={group} />
          </div>
          <CListGroup className="inspection-review-issue-group__rows">
            {group.rows.map((row) => {
              const detailLines = [row.description, row.remarks, row.status].filter(Boolean)
              return (
                <CListGroupItem className="inspection-review-issue-row" key={row.key}>
                  <div className="fw-semibold">{row.title}</div>
                  {detailLines.length > 0 ? (
                    <div className="text-body-secondary">{detailLines.join(' - ')}</div>
                  ) : null}
                </CListGroupItem>
              )
            })}
          </CListGroup>
        </div>
      ))}
    </div>
  )
}

const InspectionReviewIncompleteList = ({ item }) => {
  const groups = Array.isArray(item.incompleteGroups) ? item.incompleteGroups : []
  if (groups.length === 0) return null

  return (
    <div className="inspection-review-issue-list">
      {groups.map((group) => (
        <div className="inspection-review-issue-group" key={group.key}>
          <div className="inspection-review-issue-group__header">
            <InspectionReviewLocationContext group={group} />
          </div>
          <CListGroup className="inspection-review-issue-group__rows">
            {group.rows.map((row) => (
              <CListGroupItem className="inspection-review-issue-row" key={row.key}>
                <div className="fw-semibold">{row.title}</div>
                <div className="text-body-secondary">Complete this item before submission.</div>
              </CListGroupItem>
            ))}
          </CListGroup>
        </div>
      ))}
    </div>
  )
}

const InspectionReviewDetailDrawer = ({ item, visible, onClose }) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  if (!item) return null

  const issueCount = item.metrics?.issueCount || 0
  const incompleteCount = Number(item.metrics?.incompleteCount || 0)
  const locationCount = item.locationRows?.length || 0
  const reportPhotoGroups = Array.isArray(item.reportPhotoGroups) ? item.reportPhotoGroups : []
  const reportPhotoCount = reportPhotoGroups.reduce(
    (count, group) => count + (Array.isArray(group?.photos) ? group.photos.length : 0),
    0,
  )
  const reportRemarks = String(item.form?.reportRemarks || '').trim()
  const checkedGroupLabel = toTitleCase(item.labels?.groupPlural || 'locations')
  const title = `${item.displayTitle} Details`
  const content = (
    <div className="inspection-review-detail-drawer__content">
      <section className="inspection-review-detail-section">
        <h3 className="inspection-review-detail-section__title h6 mb-0">
          {checkedGroupLabel} checked ({locationCount})
        </h3>
        <InspectionReviewLocationsList item={item} />
      </section>
      <section className="inspection-review-detail-section">
        <h3 className="inspection-review-detail-section__title h6 mb-0">
          Issues recorded ({issueCount})
        </h3>
        <InspectionReviewIssuesList item={item} />
      </section>
      {incompleteCount > 0 ? (
        <section className="inspection-review-detail-section">
          <h3 className="inspection-review-detail-section__title h6 mb-0">
            Items needing completion ({incompleteCount})
          </h3>
          <InspectionReviewIncompleteList item={item} />
        </section>
      ) : null}
      {reportRemarks || reportPhotoCount > 0 ? (
        <section className="inspection-review-detail-section">
          <h3 className="inspection-review-detail-section__title h6 mb-0">
            Additional report evidence
            {reportPhotoCount > 0 ? ` (${reportPhotoCount})` : ''}
          </h3>
          {reportRemarks ? (
            <div className="inspection-review-report-remarks" style={{ whiteSpace: 'pre-wrap' }}>
              {reportRemarks}
            </div>
          ) : null}
          <InspectionReviewInlinePhotoGroups groups={reportPhotoGroups} />
        </section>
      ) : null}
    </div>
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        className="inspection-review-detail-drawer"
        bodyClassName="inspection-review-detail-drawer__body"
        onClose={onClose}
      >
        {content}
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" scrollable>
      <CModalHeader onClose={onClose}>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="inspection-review-detail-drawer__body">{content}</CModalBody>
    </CModal>
  )
}

const InspectionReviewSubmitDrawer = ({
  item,
  visible,
  isSubmitting,
  isUpdateMode = false,
  mayQueue = false,
  onClose,
  onConfirm,
}) => {
  if (!item) return null

  return (
    <ActionConfirmModal
      visible={visible}
      title={getSubmitTitle(item, isUpdateMode, mayQueue)}
      message={
        <div className="d-grid gap-2">
          <div>
            Confirm that you want to {mayQueue ? 'queue' : isUpdateMode ? 'update' : 'submit'} the
            following inspection:
          </div>
          <div className="inspection-review-submit-summary">
            <div>Date: {formatInspectionDate(item.form?.inspectedAt || item.inspectedAt)}</div>
            <div>{item.groupSummary}</div>
            <div>{item.itemSummary}</div>
            <div>{item.issueSummary}</div>
            {item.locationRows?.length ? (
              <div className="mt-2">
                <div className="fw-semibold">
                  Included {item.labels?.groupPlural || 'locations'}
                </div>
                <ul className="mb-0 ps-3">
                  {item.locationRows.map((location) => (
                    <li key={location.key}>
                      {[
                        location.zoneLabel,
                        location.areaLabel || location.title,
                        location.locationLabel,
                      ]
                        .filter(Boolean)
                        .join(' > ')}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      }
      confirmLabel={mayQueue ? 'Confirm Queue' : isUpdateMode ? 'Confirm Update' : 'Confirm Submit'}
      confirmDisabled={isSubmitting}
      cancelDisabled={isSubmitting}
      mobileDrawer
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

const InspectionReviewDashboard = ({
  items,
  isSubmitting = false,
  isRetryingSync = false,
  isUpdateMode = false,
  mayQueue = false,
  queueWarning = '',
  onRetrySync,
  onSubmit,
}) => {
  const dashboardItems = useMemo(() => buildInspectionReviewDashboardItems(items), [items])
  const [detailTargetKey, setDetailTargetKey] = useState('')
  const [submitTargetKey, setSubmitTargetKey] = useState('')
  const detailTarget = dashboardItems.find((item) => item.key === detailTargetKey) || null
  const submitTarget = dashboardItems.find((item) => item.key === submitTargetKey) || null

  const openDetails = (itemKey) => {
    setDetailTargetKey(itemKey)
  }

  const closeDetails = () => {
    setDetailTargetKey('')
  }

  const requestSubmit = (item) => {
    setSubmitTargetKey(item.key)
  }

  const closeSubmitDrawer = () => {
    if (!isSubmitting) setSubmitTargetKey('')
  }

  const confirmSubmit = () => {
    if (!submitTarget) return
    const result = onSubmit?.(submitTarget)
    if (result && typeof result.then === 'function') {
      result.then(() => setSubmitTargetKey(''))
      return
    }
    setSubmitTargetKey('')
  }

  return (
    <section className="inspection-review-page inspection-review-dashboard d-grid gap-3">
      {queueWarning ? (
        <CAlert color="warning" className="mb-0">
          {queueWarning}
        </CAlert>
      ) : null}
      <div className="inspection-review-dashboard__cards d-grid gap-2">
        {dashboardItems.length === 0 ? (
          <CAlert color="info" className="mb-0">
            No saved inspection work is pending submission.
          </CAlert>
        ) : (
          dashboardItems.map((item) => (
            <InspectionReviewTypeCard
              key={item.key}
              item={item}
              selected={detailTargetKey === item.key}
              isSubmitting={isSubmitting}
              isRetryingSync={isRetryingSync}
              isUpdateMode={isUpdateMode}
              mayQueue={mayQueue}
              onViewDetails={openDetails}
              onSubmit={requestSubmit}
              onRetrySync={onRetrySync}
            />
          ))
        )}
      </div>

      <InspectionReviewDetailDrawer
        item={detailTarget}
        visible={Boolean(detailTarget)}
        onClose={closeDetails}
      />

      <InspectionReviewSubmitDrawer
        item={submitTarget}
        visible={Boolean(submitTarget)}
        isSubmitting={isSubmitting}
        isUpdateMode={isUpdateMode}
        mayQueue={mayQueue}
        onClose={closeSubmitDrawer}
        onConfirm={confirmSubmit}
      />
    </section>
  )
}

export default InspectionReviewDashboard
