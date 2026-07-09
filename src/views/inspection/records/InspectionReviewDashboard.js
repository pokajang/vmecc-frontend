import React, { useMemo, useState } from 'react'
import { CAlert, CButton, CFormLabel, CListGroup, CListGroupItem } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { buildInspectionReviewDashboardItems } from './inspectionReviewDashboardAdapter'

const RETRYABLE_SYNC_BLOCKERS = new Set(['draft-sync-failed', 'fire-extinguisher-session-sync'])
const BACKGROUND_SYNC_BLOCKERS = new Set(['draft-sync-pending'])

const getRetryableSyncBlocker = (blockers = []) =>
  blockers.find((blocker) => RETRYABLE_SYNC_BLOCKERS.has(blocker?.key))

const getBackgroundSyncBlocker = (blockers = []) =>
  blockers.find((blocker) => BACKGROUND_SYNC_BLOCKERS.has(blocker?.key))

const getVisibleWarningBlocker = (blockers = []) =>
  blockers.find(
    (blocker) =>
      !BACKGROUND_SYNC_BLOCKERS.has(blocker?.key) && !RETRYABLE_SYNC_BLOCKERS.has(blocker?.key),
  )

const getIssueColor = (issueCount) => (issueCount > 0 ? 'warning' : 'success')

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

const getSubmitTitle = (item = {}, isUpdateMode = false) => {
  const title = String(item.displayTitle || 'Inspection').trim()
  const action = isUpdateMode ? 'Update' : 'Submit'
  return `${action} ${/inspection$/i.test(title) ? title : `${title} Inspection`}?`
}

const InspectionReviewTypeCard = ({
  item,
  selected,
  isSubmitting,
  isUpdateMode = false,
  onViewDetails,
  onSubmit,
  onRetrySync,
}) => {
  const blockers = Array.isArray(item.blockers) ? item.blockers : []
  const canSubmit = blockers.length === 0 && !isSubmitting
  const retryableSyncBlocker = getRetryableSyncBlocker(blockers)
  const backgroundSyncBlocker = getBackgroundSyncBlocker(blockers)
  const visibleWarningBlocker = getVisibleWarningBlocker(blockers)

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
            <div className="text-warning-emphasis mt-2">{visibleWarningBlocker.message}</div>
          ) : null}
        </div>
        <div className="inspection-review-type-card__actions">
          {retryableSyncBlocker ? (
            <CButton size="sm" color="warning" variant="outline" onClick={() => onRetrySync(item)}>
              Retry Sync
            </CButton>
          ) : null}
          <CButton size="sm" color="primary" disabled={!canSubmit} onClick={() => onSubmit(item)}>
            {backgroundSyncBlocker
              ? backgroundSyncBlocker.message || 'Syncing...'
              : isUpdateMode
                ? 'Update'
                : 'Submit'}
          </CButton>
          <CButton
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
                  <img
                    className="inspection-review-photo-card__image"
                    src={photo.url}
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
        No checked locations are available for this inspection.
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
    <div className="inspection-review-issue-group__zone">{group.zoneLabel || group.subtitle}</div>
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

const InspectionReviewDetailDrawer = ({ item, visible, onClose }) => {
  if (!item) return null

  const issueCount = item.metrics?.issueCount || 0
  const locationCount = item.locationRows?.length || 0

  return (
    <MobileBottomDrawer
      visible={visible}
      title={`${item.displayTitle} Details`}
      className="inspection-review-detail-drawer"
      bodyClassName="inspection-review-detail-drawer__body"
      onClose={onClose}
    >
      <div className="inspection-review-detail-drawer__content">
        <section className="inspection-review-detail-section">
          <CFormLabel className="inspection-review-detail-section__title mb-0">
            Locations checked ({locationCount})
          </CFormLabel>
          <InspectionReviewLocationsList item={item} />
        </section>
        <section className="inspection-review-detail-section">
          <CFormLabel className="inspection-review-detail-section__title mb-0">
            Issues recorded ({issueCount})
          </CFormLabel>
          <InspectionReviewIssuesList item={item} />
        </section>
      </div>
    </MobileBottomDrawer>
  )
}

const InspectionReviewSubmitDrawer = ({
  item,
  visible,
  isSubmitting,
  isUpdateMode = false,
  onClose,
  onConfirm,
}) => {
  if (!item) return null

  return (
    <ActionConfirmModal
      visible={visible}
      title={getSubmitTitle(item, isUpdateMode)}
      message={
        <div className="d-grid gap-2">
          <div>
            Confirm that you want to {isUpdateMode ? 'update' : 'submit'} the following inspection:
          </div>
          <div className="inspection-review-submit-summary">
            <div>Date: {formatInspectionDate(item.form?.inspectedAt || item.inspectedAt)}</div>
            <div>{item.groupSummary}</div>
            <div>{item.itemSummary}</div>
            <div>{item.issueSummary}</div>
          </div>
        </div>
      }
      confirmLabel={isUpdateMode ? 'Confirm Update' : 'Confirm Submit'}
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
  isUpdateMode = false,
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
              isUpdateMode={isUpdateMode}
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
        onClose={closeSubmitDrawer}
        onConfirm={confirmSubmit}
      />
    </section>
  )
}

export default InspectionReviewDashboard
