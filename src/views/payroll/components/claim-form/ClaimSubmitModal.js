import React from 'react'
import {
  CButton,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

const ClaimSubmitModal = ({
  visible,
  title,
  summaryItems = [],
  lineItems = [],
  lineItemsLabel = 'Item Summary',
  lineItemsVariant = 'cards',
  showTotalRow = true,
  totalLabel,
  totalValue,
  finalHighlightLabel = '',
  finalHighlightValue = '',
  onPreviewAttachment,
  declarationId,
  declarationLabel,
  declarationChecked,
  onDeclarationChange,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm Submit',
  isSubmitting = false,
}) => {
  return (
    <CModal alignment="center" visible={visible} onClose={isSubmitting ? undefined : onClose}>
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div className="d-grid gap-2">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="d-flex justify-content-between align-items-start gap-3"
            >
              <span className="text-body-secondary">{item.label}</span>
              <span className="text-end">{item.value}</span>
            </div>
          ))}

          {lineItems.length > 0 && (
            <div className="d-grid gap-2 pt-2">
              <span className="fw-semibold">{lineItemsLabel}</span>
              <div
                className={
                  lineItemsVariant === 'compact' ? 'border rounded-2 bg-white' : 'd-grid gap-2'
                }
                style={{ maxHeight: 220, overflowY: 'auto' }}
              >
                {lineItems.map((item, index) => {
                  if (lineItemsVariant === 'compact') {
                    const details = [item.meta, item.note].filter(Boolean).join(' | ')
                    return (
                      <div
                        key={item.id || `${item.title || 'item'}-${index}`}
                        className={`d-flex justify-content-between align-items-start gap-3 px-2 py-2 ${index > 0 ? 'border-top' : ''}`}
                      >
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{item.title || 'Item'}</div>
                          {details && <div className="small text-body-secondary">{details}</div>}
                        </div>
                        <div className="text-end">
                          {item.attachmentName && (
                            <div className="small text-body-secondary d-flex align-items-center justify-content-end gap-2">
                              <span>Attached</span>
                              {typeof onPreviewAttachment === 'function' && (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0 align-baseline"
                                  onClick={() => onPreviewAttachment(item)}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          )}
                          <div className="fw-semibold text-nowrap">{item.amount || '-'}</div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={item.id || `${item.title || 'item'}-${index}`}
                      className="border rounded-2 px-2 py-2 d-flex justify-content-between align-items-start gap-3"
                    >
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{item.title || 'Item'}</div>
                        {item.meta && <div className="small text-body-secondary">{item.meta}</div>}
                        {item.note && <div className="small text-body-secondary">{item.note}</div>}
                      </div>
                      <div className="text-end">
                        {item.attachmentName && (
                          <div className="small text-body-secondary d-flex align-items-center justify-content-end gap-2">
                            <span>Attached</span>
                            {typeof onPreviewAttachment === 'function' && (
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 align-baseline"
                                onClick={() => onPreviewAttachment(item)}
                              >
                                View
                              </button>
                            )}
                          </div>
                        )}
                        <div className="fw-semibold text-nowrap">{item.amount || '-'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {showTotalRow && (
            <div className="d-flex justify-content-between align-items-center gap-3 pt-2">
              <span className="fw-semibold">{totalLabel}</span>
              <span className="fw-semibold">{totalValue}</span>
            </div>
          )}

          {finalHighlightLabel && (
            <div className="border rounded-2 px-3 py-2 bg-success-subtle border-success-subtle d-flex justify-content-between align-items-center gap-3">
              <span className="fw-semibold text-success-emphasis">{finalHighlightLabel}</span>
              <span className="fw-semibold text-success-emphasis text-nowrap">
                {finalHighlightValue || '-'}
              </span>
            </div>
          )}
        </div>

        <CFormCheck
          id={declarationId}
          checked={declarationChecked}
          onChange={(e) => onDeclarationChange(e.target.checked)}
          label={declarationLabel}
        />
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onConfirm} disabled={!declarationChecked || isSubmitting}>
          {confirmLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ClaimSubmitModal
