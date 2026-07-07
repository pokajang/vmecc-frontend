import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import RowActions from 'src/components/RowActions'

export const buildInspectionElementActions = ({
  canReset = false,
  onReset,
  canEdit = false,
  onEdit,
  canDelete = false,
  onDelete,
  extraActions = [],
  disableManage = false,
  disabledReason = 'Save or cancel changes first.',
} = {}) =>
  [
    canReset && typeof onReset === 'function'
      ? {
          key: 'reset',
          label: 'Reset check',
          className: 'text-danger',
          onClick: onReset,
        }
      : null,
    canEdit && typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit',
          disabled: disableManage,
          disabledReason: disableManage ? disabledReason : '',
          onClick: onEdit,
        }
      : null,
    canDelete && typeof onDelete === 'function'
      ? {
          key: 'delete',
          label: 'Delete',
          className: 'text-danger',
          disabled: disableManage,
          disabledReason: disableManage ? disabledReason : '',
          onClick: onDelete,
        }
      : null,
    ...extraActions.map((action) =>
      action && disableManage
        ? {
            ...action,
            disabled: action.disabled || disableManage,
            disabledReason: action.disabledReason || disabledReason,
          }
        : action,
    ),
  ].filter(Boolean)

export const InspectionElementCard = ({
  title,
  meta = null,
  mobileMeta,
  status = null,
  badges = null,
  actions = [],
  actionLabel = 'Element actions',
  expanded = true,
  active = false,
  readOnly = false,
  onToggle,
  bodyId,
  dataAttributes = {},
  cardClassName = '',
  headerClassName = '',
  bodyClassName = 'inspection-hydraulic-card-body d-grid gap-3',
  showBody = expanded || readOnly,
  children,
}) => {
  const canToggle = !readOnly && typeof onToggle === 'function'
  const hasSeparateMobileMeta = mobileMeta !== undefined

  return (
    <CCard
      className={`inspection-hydraulic-card inspection-check-card ${
        active ? 'border-primary shadow-sm' : ''
      } ${!expanded && !readOnly ? 'inspection-fire-extinguisher-card--collapsed' : ''} ${
        cardClassName || ''
      }`.trim()}
      {...dataAttributes}
    >
      <CCardHeader
        className={`inspection-hydraulic-card-header inspection-fire-extinguisher-card-header d-flex flex-wrap align-items-center justify-content-between gap-2 ${
          headerClassName || ''
        }`.trim()}
        role={canToggle ? 'button' : undefined}
        tabIndex={canToggle ? 0 : undefined}
        aria-expanded={canToggle ? expanded : undefined}
        aria-controls={canToggle ? bodyId : undefined}
        onClick={(event) => {
          if (!canToggle || shouldIgnoreInspectionElementToggle(event)) return
          onToggle()
        }}
        onKeyDown={(event) => {
          if (!canToggle || shouldIgnoreInspectionElementToggle(event)) return
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onToggle()
        }}
      >
        <div
          className="d-grid gap-1 inspection-fire-extinguisher-card-summary flex-grow-1"
          style={{ minWidth: 0 }}
        >
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-break inspection-fire-extinguisher-card-title">
              {title}
            </div>
            {status}
            {badges}
          </div>
          {hasSeparateMobileMeta && meta ? (
            <div className="small text-body-secondary text-break d-none d-md-block">{meta}</div>
          ) : null}
          {!hasSeparateMobileMeta && meta ? (
            <div className="small text-body-secondary text-break inspection-fire-extinguisher-card-mobile-line">
              {meta}
            </div>
          ) : null}
          {hasSeparateMobileMeta && mobileMeta ? (
            <div className="small text-body-secondary d-md-none inspection-fire-extinguisher-card-mobile-line">
              {mobileMeta}
            </div>
          ) : null}
        </div>
        {!readOnly ? (
          <div
            className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0 inspection-fire-extinguisher-card-actions"
            data-prevent-card-toggle="true"
          >
            {canToggle ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                size="sm"
                className="inspection-compact-action-btn d-none d-md-inline-flex"
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={onToggle}
              >
                {expanded ? 'Collapse' : 'Open'}
              </CButton>
            ) : null}
            {actions.length > 0 ? (
              <RowActions
                iconSize={16}
                hitArea={32}
                toggleAriaLabel={actionLabel}
                items={actions}
              />
            ) : null}
          </div>
        ) : null}
      </CCardHeader>
      {showBody ? (
        <CCardBody id={bodyId} className={bodyClassName}>
          {children}
        </CCardBody>
      ) : null}
    </CCard>
  )
}

export const InspectionElementDrawerFooter = ({
  statusText = '',
  dirty = false,
  saving = false,
  onCancel,
  onSave,
}) => (
  <div className="inspection-fire-extinguisher-drawer-footer mobile-bottom-drawer__footer d-flex align-items-center justify-content-between gap-2">
    <div className="small text-body-secondary" aria-live="polite">
      {saving ? 'Saving...' : statusText || (dirty ? 'Unsaved changes' : 'No changes')}
    </div>
    <div className="d-flex gap-2">
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        disabled={saving}
        onClick={onCancel}
      >
        Cancel
      </CButton>
      <CButton type="button" color="primary" size="sm" disabled={saving || !dirty} onClick={onSave}>
        Save
      </CButton>
    </div>
  </div>
)

export const shouldIgnoreInspectionElementToggle = (event) => {
  const target = event?.target
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, option, label, summary, [data-prevent-card-toggle="true"]',
    ),
  )
}
