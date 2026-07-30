import React from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { ChevronDown } from 'lucide-react'
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
  helperLines = [],
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
  const visibleHelperLines = (Array.isArray(helperLines) ? helperLines : [helperLines]).filter(
    Boolean,
  )
  const SummaryComponent = canToggle ? 'button' : 'div'

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
      >
        <SummaryComponent
          type={canToggle ? 'button' : undefined}
          className={`d-flex align-items-center gap-2 inspection-fire-extinguisher-card-summary ${
            canToggle ? 'inspection-entity-card__toggle' : 'flex-grow-1'
          }`}
          style={{ minWidth: 0 }}
          aria-expanded={canToggle ? expanded : undefined}
          aria-controls={canToggle ? bodyId : undefined}
          onClick={canToggle ? onToggle : undefined}
        >
          <div className="d-grid gap-1 flex-grow-1 min-w-0">
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
            {visibleHelperLines.map((line, index) => (
              <div
                key={typeof line === 'string' ? line : index}
                className="small text-body-secondary text-break inspection-fire-extinguisher-card-mobile-line"
              >
                {line}
              </div>
            ))}
          </div>
          {canToggle ? (
            <ChevronDown
              size={18}
              className={`inspection-entity-card__chevron ${
                expanded ? 'inspection-entity-card__chevron--expanded' : ''
              }`}
              aria-hidden="true"
            />
          ) : null}
        </SummaryComponent>
        {!readOnly ? (
          <div
            className="d-flex flex-wrap align-items-center justify-content-end gap-1 flex-shrink-0 inspection-fire-extinguisher-card-actions"
            data-prevent-card-toggle="true"
          >
            {actions.length > 0 ? (
              <RowActions
                iconSize={16}
                hitArea={44}
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

export const InspectionElementValidationBadges = ({ missingCount = 0, needsEvidence = false }) => (
  <>
    {missingCount > 0 ? (
      <CBadge color="warning" className="d-inline-flex">
        {missingCount} missing
      </CBadge>
    ) : null}
    {needsEvidence ? (
      <span className="badge rounded-pill text-bg-danger d-inline-flex align-items-center">
        Needs evidence
      </span>
    ) : null}
  </>
)

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
