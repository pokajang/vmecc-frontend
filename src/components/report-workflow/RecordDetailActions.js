import React, { useMemo, useRef, useState } from 'react'
import AppButton from 'src/components/AppButton'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import ButtonLoader from 'src/components/ButtonLoader'
import FormActionGroup from 'src/components/FormActionGroup'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import { getPrimaryRecordActionKeys, resolveRecordActions } from './recordActionResolver'

const ActionButton = ({ action, className = '', presentation }) => (
  <AppButton
    type="button"
    intent={
      action.color === 'danger' ? 'danger' : action.color === 'primary' ? 'primary' : 'neutral'
    }
    presentation={presentation || (action.variant === 'outline' ? 'soft' : 'solid')}
    className={className}
    disabled={action.disabled}
    aria-busy={action.loading || undefined}
    title={action.disabledReason}
    {...(action.testId ? { 'data-testid': action.testId } : {})}
    onClick={action.onClick}
  >
    {action.loading ? <ButtonLoader label={action.label} size={14} /> : action.label}
  </AppButton>
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
          mobileBehavior="terminal"
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
            <AppButton
              type="button"
              intent="neutral"
              className="inspection-detail-sticky-action-btn"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              {...(testAnchorPrefix ? { 'data-testid': `${testAnchorPrefix}-more-actions` } : {})}
              onClick={() => setMoreOpen(true)}
            >
              More actions
            </AppButton>
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
          <ActionButtonGroup
            layout="stack"
            className="inspection-detail-more-actions"
            ariaLabel={ariaLabel}
          >
            {drawerActions.map((action) => (
              <ActionButton
                key={action.key}
                action={{ ...action, onClick: () => queueDrawerAction(action) }}
                presentation="soft"
                className={`inspection-drawer-action inspection-drawer-action--${action.color || 'secondary'} w-100`}
              />
            ))}
          </ActionButtonGroup>
        </MobileBottomDrawer>
      ) : null}
    </>
  )
}

export default RecordDetailActions
