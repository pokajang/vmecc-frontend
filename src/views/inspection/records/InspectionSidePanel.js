import React from 'react'
import {
  CButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { ArrowLeft, X } from 'lucide-react'

const InspectionSidePanel = ({ visible, title, subtitle, children, onBack, onClose }) => (
  <COffcanvas
    visible={visible}
    placement="end"
    backdrop
    scroll={false}
    onHide={onClose}
    className="inspection-side-panel"
    aria-label={title}
    aria-describedby={subtitle ? 'fire-extinguisher-detail-subtitle' : undefined}
  >
    <COffcanvasHeader className="inspection-side-panel__header">
      <div className="inspection-side-panel__leading">
        {onBack ? (
          <CButton
            type="button"
            color="link"
            className="inspection-side-panel__icon-btn text-body-secondary"
            onClick={onBack}
            aria-label="Back to historical records"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </CButton>
        ) : null}
        <div className="min-w-0">
          <COffcanvasTitle className="inspection-side-panel__title">{title}</COffcanvasTitle>
          {subtitle ? (
            <div id="fire-extinguisher-detail-subtitle" className="inspection-side-panel__subtitle">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <CButton
        type="button"
        color="link"
        className="inspection-side-panel__icon-btn text-body-secondary"
        onClick={onClose}
        aria-label={`Close ${title}`}
      >
        <X size={18} aria-hidden="true" />
      </CButton>
    </COffcanvasHeader>
    <COffcanvasBody className="inspection-side-panel__body">{children}</COffcanvasBody>
  </COffcanvas>
)

export default InspectionSidePanel
