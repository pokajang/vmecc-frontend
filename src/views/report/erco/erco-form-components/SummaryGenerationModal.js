import React from 'react'
import {
  CAlert,
  CButton,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { Sparkles } from 'lucide-react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useIsMobile from './useIsMobile'

const AI_BUTTON_STYLE = {
  backgroundColor: 'rgba(0, 126, 122, 0.14)',
  borderColor: 'rgba(0, 126, 122, 0.32)',
  color: 'rgba(0, 126, 122, 0.95)',
}

const SummaryGenerationModal = ({
  visible,
  stage,
  currentSummary,
  generatedSummary,
  errorMessage,
  canRetry = true,
  mode = 'generate',
  onClose,
  onGenerate,
  onRetry,
  onUseGenerated,
}) => {
  const isImproveMode = mode === 'improve'
  const isMobile = useIsMobile()
  const title = isImproveMode ? 'Improve Incident Summary' : 'Generate Incident Summary'
  const closeDisabled = stage === 'loading'

  const body = (
    <div className="d-grid gap-3">
      {stage === 'confirm' ? (
        <div className="text-body-secondary">
          {isImproveMode
            ? 'Ask AI will improve the wording of your current summary using this ERCO form only. Review it before applying.'
            : 'Ensure you have completed chronology and other inputs. Ask AI will generate a draft from your current ERCO form data for review before applying.'}
        </div>
      ) : null}

      {stage === 'loading' ? (
        <div className="d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          <span className="text-body-secondary">Generating summary draft...</span>
        </div>
      ) : null}

      {stage === 'preview' ? (
        <>
          <div className="text-body-secondary">
            Review generated output before applying it to the summary field.
          </div>
          <div className="d-grid gap-2">
            <div className="fw-semibold">Current Summary</div>
            <CFormTextarea rows={4} aria-label="Current summary" value={currentSummary} readOnly />
          </div>
          <div className="d-grid gap-2">
            <div className="fw-semibold">Generated Summary Draft</div>
            <CFormTextarea
              rows={6}
              aria-label="Generated summary draft"
              value={generatedSummary}
              readOnly
            />
          </div>
        </>
      ) : null}

      {stage === 'error' ? (
        <CAlert color="danger" className="mb-0">
          {errorMessage || 'Unable to generate summary. Please try again.'}
        </CAlert>
      ) : null}
    </div>
  )
  const actions = (
    <>
      {stage === 'confirm' ? (
        <>
          <CButton type="button" color="light" onClick={onClose}>
            Review Chronology
          </CButton>
          <CButton
            type="button"
            color="light"
            className="d-inline-flex align-items-center gap-2"
            style={AI_BUTTON_STYLE}
            onClick={onGenerate}
          >
            <Sparkles size={14} />
            {isImproveMode ? 'Improve Summary' : 'Generate Summary'}
          </CButton>
        </>
      ) : null}
      {stage === 'loading' ? (
        <CButton type="button" color="light" disabled>
          Generating...
        </CButton>
      ) : null}
      {stage === 'preview' ? (
        <>
          <CButton type="button" color="light" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="button" color="success" onClick={onUseGenerated}>
            Use This Summary
          </CButton>
        </>
      ) : null}
      {stage === 'error' ? (
        <>
          <CButton type="button" color="light" onClick={onClose}>
            Cancel
          </CButton>
          {canRetry ? (
            <CButton type="button" color="danger" onClick={onRetry}>
              Retry
            </CButton>
          ) : null}
        </>
      ) : null}
    </>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        onClose={onClose}
        closeDisabled={closeDisabled}
      >
        {body}
        <div className="mobile-bottom-drawer__footer d-flex flex-wrap justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      alignment="center"
      visible={visible}
      onClose={closeDisabled ? undefined : onClose}
      fullscreen="sm"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default SummaryGenerationModal
