import React from 'react'
import FormActionGroup from 'src/components/FormActionGroup'
import {
  CAlert,
  CButton,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'

const MOBILE_BREAKPOINT = 767.98
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`

const getIsMobile = () => {
  if (typeof window === 'undefined') return false
  const matchesQuery =
    typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
  return matchesQuery || Number(window.innerWidth || 0) <= MOBILE_BREAKPOINT
}

export const useReportIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => getIsMobile())
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null
    const handler = () => setIsMobile(getIsMobile())
    handler()
    window.addEventListener('resize', handler)
    if (typeof mq?.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => {
        window.removeEventListener('resize', handler)
        mq.removeEventListener('change', handler)
      }
    }
    if (typeof mq?.addListener === 'function') {
      mq.addListener(handler)
      return () => {
        window.removeEventListener('resize', handler)
        mq.removeListener(handler)
      }
    }
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export const ReportSetupSummaryRow = ({ label, value, onEdit, onReset, showDesktop = false }) => {
  const isMobile = useReportIsMobile()
  if (!isMobile && !showDesktop) return null

  if (!isMobile) {
    return (
      <div
        className="report-setup-summary-row report-setup-summary-row--desktop rounded-3 border border-primary bg-primary bg-opacity-10"
        role="group"
        aria-label={label}
      >
        <span className="report-setup-summary-row__section-label small text-muted">{label}</span>
        <span className="report-setup-summary-row__value fw-semibold">
          <span className="text-truncate w-100">{value || '--'}</span>
        </span>
        <span className="report-setup-summary-row__actions d-inline-flex align-items-center gap-1">
          {typeof onReset === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="report-setup-summary-row__reset p-1 border-0 shadow-none"
              aria-label={`Reset ${label}`}
              title={`Reset ${label}`}
              onClick={onReset}
            >
              <RotateCcw size={15} />
            </CButton>
          ) : null}
          {typeof onEdit === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="report-setup-summary-row__edit p-1 border-0 shadow-none"
              aria-label={`Edit ${label}`}
              title={`Edit ${label}`}
              onClick={onEdit}
            >
              <Pencil size={15} />
            </CButton>
          ) : null}
        </span>
      </div>
    )
  }

  return (
    <div className="report-setup-summary-row inspection-mobile-selector-row d-flex align-items-center justify-content-between gap-3 d-md-none">
      <div
        className="inspection-mobile-selector-chip rounded-3 border border-primary bg-primary bg-opacity-10"
        role="group"
        aria-label={label}
      >
        <span className="inspection-mobile-selector-chip__section-label small text-muted">
          {label}
        </span>
        <span className="inspection-mobile-selector-chip__label report-setup-summary-row__value fw-semibold">
          <span className="text-truncate w-100">{value || '--'}</span>
        </span>
        <span className="inspection-mobile-selector-chip__actions d-inline-flex align-items-center gap-1">
          {typeof onReset === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="inspection-mobile-selector-chip__reset p-1 border-0 shadow-none"
              aria-label={`Reset ${label}`}
              title={`Reset ${label}`}
              onClick={onReset}
            >
              <RotateCcw size={15} />
            </CButton>
          ) : null}
          {typeof onEdit === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="inspection-mobile-selector-chip__edit p-1 border-0 shadow-none"
              aria-label={`Edit ${label}`}
              title={`Edit ${label}`}
              onClick={onEdit}
            >
              <Pencil size={15} />
            </CButton>
          ) : null}
        </span>
      </div>
    </div>
  )
}

export const ReportMobileActionGroup = ({
  onSaveDraft,
  onPrimary,
  saveLabel = 'Save Draft',
  primaryLabel = 'Continue',
  saveDisabled = false,
  primaryDisabled = false,
  primaryType = 'button',
  statusMessage = '',
}) => (
  <FormActionGroup
    className="inspection-form-inline-actions report-setup-actions"
    mobileThumb={false}
    leading={
      statusMessage ? (
        <div className="inspection-draft-status small text-body-secondary">{statusMessage}</div>
      ) : null
    }
    ariaLabel="Report form actions"
  >
    {typeof onSaveDraft === 'function' ? (
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        size="sm"
        className="report-setup-actions__button"
        disabled={saveDisabled}
        onClick={() => onSaveDraft()}
      >
        {saveLabel}
      </CButton>
    ) : null}
    <CButton
      type={primaryType}
      color="primary"
      size="sm"
      className="report-setup-actions__button"
      disabled={primaryDisabled}
      onClick={onPrimary}
    >
      {primaryLabel}
    </CButton>
  </FormActionGroup>
)

export const ReportSetupActions = ({
  onSaveDraft,
  onContinue,
  continueLabel = 'Continue',
  saveLabel = 'Save Draft',
  primaryType = 'button',
  statusMessage = '',
}) => (
  <ReportMobileActionGroup
    onSaveDraft={onSaveDraft}
    onPrimary={onContinue}
    saveLabel={saveLabel}
    primaryLabel={continueLabel}
    primaryType={primaryType}
    statusMessage={statusMessage}
  />
)

export const ReportMobileContextPanel = ({ title = 'Context', items = [] }) => {
  const isMobile = useReportIsMobile()
  if (!isMobile) return null

  return (
    <div className="report-mobile-context d-md-none rounded-3 border bg-white">
      <div className="report-mobile-context__title fw-semibold">{title}</div>
      <div className="report-mobile-context__grid">
        {items.map((item) => (
          <div key={item.label} className="report-mobile-context__item">
            <div className="report-mobile-context__label">{item.label}</div>
            <div className="report-mobile-context__value">{item.value || '--'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ReportBasicPathSummary = ({ title, description, mobileSummary, items = [] }) => (
  <div className="report-basic-path-card rounded-3 border bg-white p-3 d-grid gap-2">
    <div className="fw-semibold">{title}</div>
    <div className="small text-body-secondary d-md-none">{mobileSummary || '-'}</div>
    <div className="small text-body-secondary d-none d-md-block">{description}</div>
    <div className="row g-2 small">
      {items.map((item) => (
        <div key={item.label} className={item.fullWidth ? 'col-12' : 'col-6 col-md-3'}>
          <div className="text-body-secondary">{item.label}</div>
          <div className="fw-semibold text-truncate">{item.value || '-'}</div>
        </div>
      ))}
    </div>
  </div>
)

const emptyChronologyDraft = { id: '', time: '', action: '' }

export const ReportChronologySection = ({
  title,
  actionLabel = 'Event / Action',
  fieldError,
  rows = [],
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}) => {
  const isMobile = useReportIsMobile()
  const [rowModal, setRowModal] = React.useState({ visible: false, mode: 'edit', draft: null })
  const closeRowModal = () => setRowModal({ visible: false, mode: 'edit', draft: null })
  const openEditRowModal = (row) =>
    setRowModal({ visible: true, mode: 'edit', draft: { ...emptyChronologyDraft, ...row } })
  const openAddRowModal = () =>
    setRowModal({ visible: true, mode: 'add', draft: { ...emptyChronologyDraft } })
  const updateDraft = (patch) =>
    setRowModal((prev) => ({
      ...prev,
      draft: { ...emptyChronologyDraft, ...prev.draft, ...patch },
    }))
  const saveRowModal = () => {
    const draft = rowModal.draft || emptyChronologyDraft
    if (rowModal.mode === 'add') {
      onAddRow?.({ time: draft.time, action: draft.action })
    } else if (draft.id) {
      onUpdateRow?.(draft.id, { time: draft.time, action: draft.action })
    }
    closeRowModal()
  }

  return (
    <div className="mb-3 d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center gap-2">
        <div className="fw-semibold text-muted">{title}</div>
        {isMobile ? (
          <CButton
            type="button"
            color="light"
            size="sm"
            className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
            onClick={openAddRowModal}
          >
            <Plus size={14} />
            Add
          </CButton>
        ) : (
          <CButton
            type="button"
            color="light"
            size="sm"
            className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
            onClick={() => onAddRow?.()}
          >
            <Plus size={14} />
            Add Row
          </CButton>
        )}
      </div>
      {fieldError ? <CAlert color="danger">{fieldError}</CAlert> : null}

      {isMobile ? (
        <div className="report-chronology-mobile-list d-md-none">
          {rows.map((row, idx) => {
            const isOnly = rows.length <= 1
            return (
              <div key={row.id} className="report-chronology-mobile-row">
                <button
                  type="button"
                  className="report-chronology-mobile-row__main"
                  aria-label={`Edit chronology row ${idx + 1}`}
                  onClick={() => openEditRowModal(row)}
                >
                  <span className="report-chronology-mobile-row__time">
                    {String(row.time || '').trim() || '--:--'}
                  </span>
                  <span className="report-chronology-mobile-row__action">
                    {String(row.action || '').trim() || 'No action recorded.'}
                  </span>
                </button>
                <CDropdown alignment="end">
                  <CDropdownToggle
                    type="button"
                    color="light"
                    size="sm"
                    caret={false}
                    className="report-chronology-mobile-row__menu"
                    aria-label={`Chronology row ${idx + 1} actions`}
                  >
                    <MoreHorizontal size={16} />
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem onClick={() => openEditRowModal(row)}>
                      <span className="d-inline-flex align-items-center gap-2">
                        <Pencil size={14} /> Edit
                      </span>
                    </CDropdownItem>
                    <CDropdownItem
                      disabled={isOnly}
                      className="text-danger"
                      onClick={() => {
                        if (!isOnly) onRemoveRow?.(row.id)
                      }}
                    >
                      <span className="d-inline-flex align-items-center gap-2">
                        <Trash2 size={14} /> Delete
                      </span>
                    </CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="d-none d-md-block">
          {rows.map((row, idx) => (
            <CRow key={row.id} className="g-2 mb-2 align-items-end">
              <CCol xs={12} md={2}>
                <CFormLabel>Time</CFormLabel>
                <CFormInput
                  type="time"
                  value={row.time}
                  onChange={(event) => onUpdateRow?.(row.id, { time: event.target.value })}
                />
              </CCol>
              <CCol xs={12} md={9}>
                <CFormLabel>{actionLabel}</CFormLabel>
                <CFormInput
                  value={row.action}
                  onChange={(event) => onUpdateRow?.(row.id, { action: event.target.value })}
                />
              </CCol>
              <CCol xs={12} md={1} className="d-grid">
                <CButton
                  type="button"
                  color="light"
                  disabled={rows.length <= 1}
                  onClick={() => onRemoveRow?.(row.id)}
                >
                  {idx === 0 ? 'Keep' : 'Del'}
                </CButton>
              </CCol>
            </CRow>
          ))}
        </div>
      )}

      <CModal visible={rowModal.visible} fullscreen="sm" onClose={closeRowModal}>
        <CModalHeader closeButton>
          <CModalTitle>
            {rowModal.mode === 'add' ? 'Add Chronology Row' : 'Edit Chronology Row'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="d-grid gap-3">
          <div>
            <CFormLabel>Time</CFormLabel>
            <CFormInput
              type="time"
              value={rowModal.draft?.time || ''}
              onChange={(event) => updateDraft({ time: event.target.value })}
            />
          </div>
          <div>
            <CFormLabel>{actionLabel}</CFormLabel>
            <CFormInput
              value={rowModal.draft?.action || ''}
              onChange={(event) => updateDraft({ action: event.target.value })}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton type="button" color="light" onClick={closeRowModal}>
            Cancel
          </CButton>
          <CButton type="button" color="primary" onClick={saveRowModal}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}
