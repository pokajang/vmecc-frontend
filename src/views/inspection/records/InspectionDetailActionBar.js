import React, { useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'

const buildDesktopButton = (action) => (
  <CButton
    key={action.key}
    color={action.color}
    variant={action.variant}
    disabled={action.disabled}
    onClick={action.onClick}
  >
    {action.label}
  </CButton>
)

const buildMobileButton = (action, className = '') => (
  <CButton
    key={action.key}
    color={action.color}
    variant={action.variant}
    className={className}
    disabled={action.disabled}
    onClick={action.onClick}
  >
    {action.label}
  </CButton>
)

const createActionDescriptors = ({
  record,
  onBack,
  onEditRecord,
  canEditRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId,
  isActionBusy,
}) => {
  const descriptors = []

  descriptors.push({
    key: 'back',
    label: 'Back to records',
    color: 'light',
    onClick: onBack,
  })

  if (typeof onEditRecord === 'function' && canEditRecord?.(record)) {
    descriptors.push({
      key: 'edit',
      label: 'Edit',
      color: 'primary',
      variant: 'outline',
      onClick: () => onEditRecord(record),
    })
  }

  if (typeof onDownloadRecord === 'function') {
    descriptors.push({
      key: 'download',
      label: downloadingId === record.id ? 'Generating...' : 'Download',
      color: 'secondary',
      variant: 'outline',
      disabled: Boolean(downloadingId) || record.canDownloadPdf !== true,
      onClick: () => onDownloadRecord(record.id),
    })
  }

  if (record.canReview === true && typeof onReviewRecord === 'function') {
    descriptors.push({
      key: 'review',
      label: 'Review',
      color: 'primary',
      disabled: isActionBusy,
      onClick: () => onReviewRecord(record),
    })
  }

  if (record.canApprove === true && typeof onApproveRecord === 'function') {
    descriptors.push({
      key: 'approve',
      label: 'Approve',
      color: 'success',
      disabled: isActionBusy,
      onClick: () => onApproveRecord(record),
    })
  }

  if (record.canReject === true && typeof onRejectRecord === 'function') {
    descriptors.push({
      key: 'reject',
      label: 'Reject',
      color: 'danger',
      disabled: isActionBusy,
      onClick: () => onRejectRecord(record),
    })
  }

  return descriptors
}

const getMobilePrimaryActionKeys = (descriptors) => {
  const keys = descriptors.map((descriptor) => descriptor.key)
  if (keys.includes('approve') || keys.includes('reject')) {
    return ['approve', 'reject'].filter((key) => keys.includes(key))
  }
  if (keys.includes('review')) return ['review']
  if (keys.includes('edit')) return ['edit']
  return []
}

const InspectionDetailActionBar = ({
  record,
  onBack,
  onEditRecord,
  canEditRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId = null,
  isActionBusy = false,
  mode = 'both',
}) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const descriptors = useMemo(
    () =>
      createActionDescriptors({
        record,
        onBack,
        onEditRecord,
        canEditRecord,
        onReviewRecord,
        onApproveRecord,
        onRejectRecord,
        onDownloadRecord,
        downloadingId,
        isActionBusy,
      }),
    [
      canEditRecord,
      downloadingId,
      isActionBusy,
      onApproveRecord,
      onBack,
      onDownloadRecord,
      onEditRecord,
      onRejectRecord,
      onReviewRecord,
      record,
    ],
  )
  const mobilePrimaryActionKeys = getMobilePrimaryActionKeys(descriptors)
  const mobilePrimaryActions = mobilePrimaryActionKeys
    .map((key) => descriptors.find((descriptor) => descriptor.key === key))
    .filter(Boolean)
  const moreActions = descriptors.filter(
    (descriptor) => descriptor.key !== 'back' && !mobilePrimaryActionKeys.includes(descriptor.key),
  )
  const utilityActions = descriptors.filter((descriptor) => descriptor.key === 'back')
  const drawerActions = [...moreActions, ...utilityActions]
  const showDesktop = mode === 'both' || mode === 'desktop'
  const showMobile = mode === 'both' || mode === 'mobile'

  return (
    <>
      {showDesktop ? (
        <div className="d-none d-md-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
          {descriptors.map(buildDesktopButton)}
        </div>
      ) : null}

      {showMobile ? (
        <FormActionGroup
          className="inspection-detail-inline-actions d-md-none"
          mobileThumb={false}
          ariaLabel="Inspection detail actions"
        >
          {mobilePrimaryActions.map((action) =>
            buildMobileButton(action, 'inspection-detail-sticky-action-btn'),
          )}
          {drawerActions.length > 0 ? (
            <CButton
              color="secondary"
              variant="outline"
              className="inspection-detail-sticky-action-btn"
              onClick={() => setMoreOpen(true)}
            >
              More
            </CButton>
          ) : null}
        </FormActionGroup>
      ) : null}

      <MobileBottomDrawer
        visible={moreOpen}
        title="More actions"
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={() => setMoreOpen(false)}
      >
        <div className="inspection-detail-more-actions">
          {drawerActions.map((action) =>
            buildMobileButton(
              {
                ...action,
                onClick: () => {
                  setMoreOpen(false)
                  action.onClick?.()
                },
              },
              'w-100',
            ),
          )}
        </div>
      </MobileBottomDrawer>
    </>
  )
}

export default InspectionDetailActionBar
