import React, { useMemo, useRef, useState } from 'react'
import { CButton } from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'
import FormActionGroup from 'src/components/FormActionGroup'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import { getPrimaryRecordActionKeys, resolveRecordActions } from './recordActionResolver'

const ActionButton = ({ action, className = '' }) => (
  <CButton
    type="button"
    color={action.color}
    variant={action.variant}
    className={className}
    disabled={action.disabled}
    aria-busy={action.loading || undefined}
    title={action.disabledReason}
    {...(action.testId ? { 'data-testid': action.testId } : {})}
    onClick={action.onClick}
  >
    {action.loading ? <ButtonLoader label={action.label} size={14} /> : action.label}
  </CButton>
)

const RecordDetailActions = ({
  record,
  handlers,
  fallbackCapabilities,
  downloadingId = null,
  isActionBusy = false,
  isDeleting = false,
  mode = 'both',
  ariaLabel = 'Record detail actions',
  testAnchorPrefix = '',
}) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const [hasPendingAction, setHasPendingAction] = useState(false)
  const pendingActionRef = useRef(null)
  const actions = useMemo(
    () =>
      resolveRecordActions({
        record,
        handlers,
        fallbackCapabilities,
        downloadingId,
        isActionBusy,
        isDeleting,
        testAnchorPrefix,
      }),
    [
      downloadingId,
      fallbackCapabilities,
      handlers,
      isActionBusy,
      isDeleting,
      record,
      testAnchorPrefix,
    ],
  )
  const primaryKeys = getPrimaryRecordActionKeys(actions)
  const primaryActions = primaryKeys
    .map((key) => actions.find((action) => action.key === key))
    .filter(Boolean)
  const drawerActions = actions.filter((action) => !primaryKeys.includes(action.key))
  const showDesktop = mode === 'both' || mode === 'desktop'
  const showMobile = mode === 'both' || mode === 'mobile'

  const closeMoreActions = () => {
    if (pendingActionRef.current) {
      setMoreOpen(false)
      return
    }
    pendingActionRef.current = null
    setHasPendingAction(false)
    setMoreOpen(false)
  }

  const queueDrawerAction = (action) => {
    if (action.disabled) return
    pendingActionRef.current = action
    setHasPendingAction(true)
    setMoreOpen(false)
  }

  const runPendingAction = () => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    setHasPendingAction(false)
    action?.onClick?.()
  }

  return (
    <>
      {showDesktop ? (
        <div className="d-none d-md-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-end">
          {actions.map((action) => (
            <ActionButton key={action.key} action={action} />
          ))}
        </div>
      ) : null}

      {showMobile ? (
        <FormActionGroup
          className="inspection-detail-inline-actions d-md-none"
          mobileThumb={false}
          ariaLabel={ariaLabel}
        >
          {primaryActions.map((action) => (
            <ActionButton
              key={action.key}
              action={action}
              className="inspection-detail-sticky-action-btn"
            />
          ))}
          {drawerActions.length > 0 ? (
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              className="inspection-detail-sticky-action-btn"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-more-actions` } : {})}
              onClick={() => setMoreOpen(true)}
            >
              More actions
            </CButton>
          ) : null}
        </FormActionGroup>
      ) : null}

      {showMobile ? (
        <MobileBottomDrawer
          visible={moreOpen}
          title="More actions"
          className="record-action-sheet"
          bodyClassName="inspection-equipment-detail-drawer-shell"
          restoreFocusOnClose={!hasPendingAction}
          onAfterClose={runPendingAction}
          onClose={closeMoreActions}
        >
          <div className="inspection-detail-more-actions" role="group" aria-label={ariaLabel}>
            {drawerActions.map((action) => (
              <ActionButton
                key={action.key}
                action={{ ...action, onClick: () => queueDrawerAction(action) }}
                className="w-100"
              />
            ))}
          </div>
        </MobileBottomDrawer>
      ) : null}
    </>
  )
}

export default RecordDetailActions
