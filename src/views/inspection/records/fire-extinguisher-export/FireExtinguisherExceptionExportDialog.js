import React from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { AlertTriangle, CalendarX2, Download } from 'lucide-react'

import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import ButtonLoader from 'src/components/ButtonLoader'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { getFireExtinguisherExportFilterNotes } from './fireExtinguisherExportFilters'
import useFireExtinguisherExceptionExport from './useFireExtinguisherExceptionExport'

const CategoryCard = ({ id, title, count, checked, disabled, icon, onChange }) => (
  <label
    htmlFor={id}
    className={`fire-extinguisher-export-card${checked ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
  >
    <input
      id={id}
      type="checkbox"
      className="form-check-input fire-extinguisher-export-card__check"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
    <span className="fire-extinguisher-export-card__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="fire-extinguisher-export-card__copy">
      <span className="fire-extinguisher-export-card__title">{title}</span>
    </span>
    <span className="fire-extinguisher-export-card__count" aria-label={`${count} ${title}`}>
      {count}
    </span>
  </label>
)

const resolveFeedbackConfirmColor = (color) => {
  if (['primary', 'success', 'info', 'warning', 'danger'].includes(color)) return color
  return 'info'
}

const FireExtinguisherExceptionExportDialog = ({ visible, filterSnapshot, onClose }) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const notes = getFireExtinguisherExportFilterNotes(filterSnapshot)
  const exportState = useFireExtinguisherExceptionExport({ visible, filterSnapshot })
  const {
    categories,
    format,
    scope,
    preview,
    isPreviewing,
    previewError,
    isDownloading,
    feedback,
    hasCurrentContext,
    setFormat,
    setScope,
    toggleCategory,
    refreshPreview,
    download,
    clearFeedback,
  } = exportState
  const selectedTotal = categories.length ? preview.total : 0
  const exportDisabled =
    isDownloading ||
    isPreviewing ||
    Boolean(previewError) ||
    categories.length === 0 ||
    selectedTotal === 0
  const formatLabel = format === 'docx' ? 'Word' : 'PDF'
  const title = 'Export fire extinguisher exceptions'
  const feedbackModal = (
    <ActionConfirmModal
      visible={Boolean(feedback?.message)}
      title={feedback?.title || 'Notice'}
      message={feedback?.message || ''}
      confirmLabel="OK"
      confirmColor={resolveFeedbackConfirmColor(feedback?.color)}
      isNotice
      showCancelAction={false}
      confirmDisabled={isDownloading}
      onClose={clearFeedback}
      onConfirm={clearFeedback}
    />
  )

  const body = (
    <div className="fire-extinguisher-export d-grid gap-3">
      <section aria-labelledby="fire-extinguisher-export-context-title">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-baseline gap-2">
            <span id="fire-extinguisher-export-context-title" className="fw-semibold">
              Scope
            </span>
            <span className="fire-extinguisher-export__supporting text-body-secondary">
              {scope === 'all' ? 'All active extinguishers' : 'Current table filters'}
            </span>
          </div>
          {hasCurrentContext ? (
            <CButton
              type="button"
              color="link"
              className="p-0 text-nowrap"
              disabled={isDownloading}
              onClick={() => setScope(scope === 'all' ? 'current_filters' : 'all')}
            >
              {scope === 'all' ? 'Use current filters' : 'Use all extinguishers'}
            </CButton>
          ) : null}
        </div>
        {scope === 'current_filters' && preview.appliedFilters.length ? (
          <div className="d-flex flex-wrap gap-1" aria-label="Applied export filters">
            {preview.appliedFilters.map((filter) => (
              <CBadge key={`${filter.key}-${filter.label}`} color="light" textColor="body">
                {filter.label}
              </CBadge>
            ))}
          </div>
        ) : null}
        {scope === 'current_filters' && notes.length ? (
          <div className="fire-extinguisher-export__supporting text-body-secondary mt-2">
            {notes.map((note) => (
              <div key={note}>{note}</div>
            ))}
          </div>
        ) : null}
      </section>

      <fieldset className="border-0 p-0 m-0" disabled={isDownloading}>
        <legend className="fw-semibold mb-2">Include</legend>
        <div className="d-grid gap-2">
          <CategoryCard
            id="fire-extinguisher-export-issues"
            title="Issues"
            count={isPreviewing ? '…' : preview.issues}
            checked={categories.includes('issues')}
            disabled={isDownloading}
            icon={<AlertTriangle size={18} />}
            onChange={() => toggleCategory('issues')}
          />
          <CategoryCard
            id="fire-extinguisher-export-expired"
            title="Expired certification"
            count={isPreviewing ? '…' : preview.expired}
            checked={categories.includes('expired')}
            disabled={isDownloading}
            icon={<CalendarX2 size={18} />}
            onChange={() => toggleCategory('expired')}
          />
        </div>
      </fieldset>

      {categories.length > 0 ? (
        <div
          className="fire-extinguisher-export__selection-summary"
          role="status"
          aria-live="polite"
        >
          {previewError ? (
            <div className="d-flex align-items-center justify-content-between gap-2 text-danger">
              <span>{previewError}</span>
              <CButton
                type="button"
                color="link"
                size="sm"
                className="p-0"
                onClick={refreshPreview}
              >
                Retry
              </CButton>
            </div>
          ) : isPreviewing ? (
            'Checking matching extinguishers…'
          ) : selectedTotal === 0 ? (
            'No extinguishers match this selection and scope.'
          ) : (
            <>
              {categories.length === 2 && preview.overlap > 0 ? (
                <div>
                  {preview.overlap} extinguishers appear in both categories and will be included
                  once.
                </div>
              ) : null}
              <div className="fw-semibold">
                {selectedTotal} unique {selectedTotal === 1 ? 'extinguisher' : 'extinguishers'} will
                be exported.
              </div>
            </>
          )}
        </div>
      ) : null}

      <fieldset className="border-0 p-0 m-0" disabled={isDownloading}>
        <legend className="fw-semibold mb-2">Format</legend>
        <div className="d-flex flex-wrap gap-3">
          <CFormCheck
            type="radio"
            id="fire-extinguisher-export-format-pdf"
            name="fire-extinguisher-export-format"
            label="PDF"
            checked={format === 'pdf'}
            onChange={() => setFormat('pdf')}
          />
          <CFormCheck
            type="radio"
            id="fire-extinguisher-export-format-docx"
            name="fire-extinguisher-export-format"
            label="Word (.docx)"
            checked={format === 'docx'}
            onChange={() => setFormat('docx')}
          />
        </div>
      </fieldset>
    </div>
  )

  const footer = (
    <>
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        disabled={isDownloading}
        onClick={onClose}
      >
        Cancel
      </CButton>
      <CButton type="button" color="primary" disabled={exportDisabled} onClick={download}>
        {isDownloading ? (
          <ButtonLoader label={`Preparing ${formatLabel}…`} />
        ) : (
          <span className="d-inline-flex align-items-center gap-1">
            <Download size={15} aria-hidden="true" />
            Export {formatLabel}
            {categories.length ? ` · ${selectedTotal} records` : ''}
          </span>
        )}
      </CButton>
    </>
  )

  if (useMobileDrawer) {
    return (
      <>
        {feedbackModal}
        <MobileBottomDrawer
          visible={visible}
          title={title}
          onClose={onClose}
          closeDisabled={isDownloading}
          bodyClassName="fire-extinguisher-export-drawer"
        >
          {body}
          <div className="mobile-bottom-drawer__footer fire-extinguisher-export__footer d-flex justify-content-end gap-2">
            {footer}
          </div>
        </MobileBottomDrawer>
      </>
    )
  }

  return (
    <>
      {feedbackModal}
      <CModal
        visible={visible}
        onClose={isDownloading ? undefined : onClose}
        alignment="center"
        scrollable
        size="lg"
        className="fire-extinguisher-export-modal"
        backdrop={isDownloading ? 'static' : true}
        keyboard={!isDownloading}
      >
        <CModalHeader closeButton={!isDownloading}>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>{body}</CModalBody>
        <CModalFooter>{footer}</CModalFooter>
      </CModal>
    </>
  )
}

export default FireExtinguisherExceptionExportDialog
