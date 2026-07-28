import React from 'react'
import FormActionGroup from 'src/components/FormActionGroup'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import MobileSetupSummaryRow from 'src/components/report-workflow/MobileSetupSummaryRow'
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
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  REPORT_MOBILE_BREAKPOINT,
  REPORT_MOBILE_QUERY,
  useReportIsMobile,
} from '../hooks/useReportIsMobile'

export { REPORT_MOBILE_BREAKPOINT, REPORT_MOBILE_QUERY, useReportIsMobile }

export const ReportSetupSummaryRow = ({
  label,
  value,
  secondaryValue = '',
  onEdit,
  onReset,
  showDesktop = false,
}) => {
  const isMobile = useReportIsMobile()
  if (!isMobile && !showDesktop) return null
  const desktopValue = [value, secondaryValue].filter(Boolean).join(' ')

  if (!isMobile) {
    return (
      <div
        className="report-setup-summary-row report-setup-summary-row--desktop rounded-3 border border-primary bg-primary bg-opacity-10"
        role="group"
        aria-label={label}
      >
        <span className="report-setup-summary-row__section-label small text-muted">{label}</span>
        <span className="report-setup-summary-row__value fw-semibold">
          <span className="text-truncate w-100">{desktopValue || '--'}</span>
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
    <div className="report-setup-summary-row mobile-setup-summary-row d-md-none">
      <MobileSetupSummaryRow
        label={label}
        value={value}
        secondaryValue={secondaryValue}
        onEdit={onEdit}
        onReset={onReset}
      />
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
    <div className="report-mobile-context d-md-none rounded-3 border bg-body">
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
  <div className="report-basic-path-card rounded-3 border bg-body p-3 d-grid gap-2">
    <div className="fw-semibold">{title}</div>
    <div className="small text-body-secondary d-md-none">{mobileSummary || '-'}</div>
    {description ? (
      <div className="small text-body-secondary d-none d-md-block">{description}</div>
    ) : null}
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
  onMoveRow,
  maxRows,
  actionMaxLength,
}) => {
  const isMobile = useReportIsMobile()
  const hasRowLimit = Number.isFinite(Number(maxRows)) && Number(maxRows) > 0
  const rowLimitReached = hasRowLimit && rows.length >= Number(maxRows)
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
  const rowEditorTitle = rowModal.mode === 'add' ? 'Add chronology row' : 'Edit chronology row'
  const rowEditorBody = (
    <div className="d-grid gap-3">
      <div>
        <CFormLabel htmlFor="report-row-modal-time">Time</CFormLabel>
        <CFormInput
          id="report-row-modal-time"
          type="time"
          value={rowModal.draft?.time || ''}
          onChange={(event) => updateDraft({ time: event.target.value })}
        />
      </div>
      <div>
        <CFormLabel htmlFor="report-row-modal-action">{actionLabel}</CFormLabel>
        <CFormInput
          id="report-row-modal-action"
          value={rowModal.draft?.action || ''}
          maxLength={actionMaxLength}
          onChange={(event) => updateDraft({ action: event.target.value })}
        />
      </div>
    </div>
  )
  const rowEditorActions = (
    <>
      <CButton type="button" color="secondary" variant="outline" onClick={closeRowModal}>
        Cancel
      </CButton>
      <CButton
        type="button"
        color="primary"
        disabled={rowModal.mode === 'add' && rowLimitReached}
        onClick={saveRowModal}
      >
        Save
      </CButton>
    </>
  )

  return (
    <div className="mb-3 d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center gap-2">
        <div>
          <div className="fw-semibold text-muted">{title}</div>
          {hasRowLimit ? (
            <div className="small text-body-secondary">
              {rows.length}/{Number(maxRows)} rows
            </div>
          ) : null}
        </div>
        {isMobile ? (
          <CButton
            type="button"
            color="light"
            size="sm"
            className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
            disabled={rowLimitReached}
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
            disabled={rowLimitReached}
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
                    {typeof onMoveRow === 'function' ? (
                      <>
                        <CDropdownItem disabled={idx === 0} onClick={() => onMoveRow(row.id, -1)}>
                          <span className="d-inline-flex align-items-center gap-2">
                            <ArrowUp size={14} /> Move up
                          </span>
                        </CDropdownItem>
                        <CDropdownItem
                          disabled={idx === rows.length - 1}
                          onClick={() => onMoveRow(row.id, 1)}
                        >
                          <span className="d-inline-flex align-items-center gap-2">
                            <ArrowDown size={14} /> Move down
                          </span>
                        </CDropdownItem>
                      </>
                    ) : null}
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
                <CFormLabel htmlFor={`report-row-${row.id}-time`}>Time</CFormLabel>
                <CFormInput
                  id={`report-row-${row.id}-time`}
                  type="time"
                  value={row.time}
                  onChange={(event) => onUpdateRow?.(row.id, { time: event.target.value })}
                />
              </CCol>
              <CCol xs={12} md={8}>
                <CFormLabel htmlFor={`report-row-${row.id}-action`}>{actionLabel}</CFormLabel>
                <CFormInput
                  id={`report-row-${row.id}-action`}
                  value={row.action}
                  maxLength={actionMaxLength}
                  onChange={(event) => onUpdateRow?.(row.id, { action: event.target.value })}
                />
              </CCol>
              <CCol xs={12} md={2} className="d-flex gap-1">
                {typeof onMoveRow === 'function' ? (
                  <>
                    <CButton
                      type="button"
                      color="light"
                      className="px-2"
                      disabled={idx === 0}
                      aria-label={`Move chronology row ${idx + 1} up`}
                      onClick={() => onMoveRow(row.id, -1)}
                    >
                      <ArrowUp size={14} />
                    </CButton>
                    <CButton
                      type="button"
                      color="light"
                      className="px-2"
                      disabled={idx === rows.length - 1}
                      aria-label={`Move chronology row ${idx + 1} down`}
                      onClick={() => onMoveRow(row.id, 1)}
                    >
                      <ArrowDown size={14} />
                    </CButton>
                  </>
                ) : null}
                <CButton
                  type="button"
                  color="light"
                  className="px-2"
                  aria-label={`Delete chronology row ${idx + 1}`}
                  disabled={rows.length <= 1}
                  onClick={() => onRemoveRow?.(row.id)}
                >
                  <Trash2 size={14} />
                </CButton>
              </CCol>
            </CRow>
          ))}
        </div>
      )}

      {isMobile ? (
        <MobileBottomDrawer
          visible={rowModal.visible}
          title={rowEditorTitle}
          onClose={closeRowModal}
        >
          {rowEditorBody}
          <div className="mobile-bottom-drawer__footer d-flex flex-wrap justify-content-end gap-2">
            {rowEditorActions}
          </div>
        </MobileBottomDrawer>
      ) : (
        <CModal visible={rowModal.visible} fullscreen="sm" onClose={closeRowModal}>
          <CModalHeader closeButton>
            <CModalTitle>{rowEditorTitle}</CModalTitle>
          </CModalHeader>
          <CModalBody>{rowEditorBody}</CModalBody>
          <CModalFooter>{rowEditorActions}</CModalFooter>
        </CModal>
      )}
    </div>
  )
}
