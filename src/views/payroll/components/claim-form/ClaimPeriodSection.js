import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { Calendar, Pencil } from 'lucide-react'

const ClaimPeriodSection = ({
  title = 'Claim Month',
  options = [],
  value = '',
  onChange,
  confirmed = false,
  onConfirm,
  onChangePeriod,
  continueLabel = 'Continue',
  compact = false,
  frameless = false,
}) => {
  const selectedOption = options.find((option) => option.value === value)
  const shouldShowSingle = compact && confirmed
  const renderedOptions = shouldShowSingle && selectedOption ? [selectedOption] : options

  const content = (
    <>
      <div className="d-grid gap-2">
        <CRow className="g-2" role="group" aria-label={title}>
          {renderedOptions.map((option) => {
            const isActive = value === option.value
            const isDisabled = confirmed
            return (
              <CCol key={option.value} xs={12} sm={6} md={3}>
                <div
                  role={shouldShowSingle ? undefined : 'button'}
                  tabIndex={shouldShowSingle ? undefined : isDisabled ? -1 : 0}
                  onClick={() => {
                    if (shouldShowSingle || isDisabled || !onChange) return
                    onChange(option.value)
                  }}
                  onKeyDown={(event) => {
                    if (shouldShowSingle || isDisabled || !onChange) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onChange(option.value)
                    }
                  }}
                  aria-disabled={shouldShowSingle ? undefined : isDisabled}
                  aria-pressed={shouldShowSingle ? undefined : isActive}
                  className={`rounded-3 border h-100 d-flex align-items-center gap-2 px-3 py-3 ${
                    isActive
                      ? 'border-primary bg-primary bg-opacity-10'
                      : 'border-light-subtle bg-white'
                  } ${!shouldShowSingle && isDisabled ? 'opacity-75' : ''}`}
                  style={{
                    cursor: shouldShowSingle ? 'default' : isDisabled ? 'not-allowed' : 'pointer',
                    minHeight: 56,
                  }}
                >
                  <div
                    className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                      isActive ? 'bg-primary text-white' : 'bg-light text-primary'
                    }`}
                    style={{ width: 28, height: 28, flex: '0 0 28px' }}
                  >
                    <Calendar size={14} />
                  </div>
                  <span
                    className="fw-medium"
                    style={{
                      color: isActive ? 'var(--cui-primary)' : 'var(--cui-body-color)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {option.label}
                  </span>
                  {shouldShowSingle && onChangePeriod && (
                    <CButton
                      color="light"
                      size="sm"
                      type="button"
                      className="ms-auto d-inline-flex align-items-center justify-content-center"
                      style={{ width: 32, height: 32 }}
                      onClick={onChangePeriod}
                    >
                      <Pencil size={14} />
                    </CButton>
                  )}
                </div>
              </CCol>
            )
          })}
        </CRow>
      </div>
      {!confirmed && onConfirm && (
        <div className="d-flex justify-content-end">
          <CButton color="primary" size="sm" onClick={onConfirm}>
            {continueLabel}
          </CButton>
        </div>
      )}
    </>
  )

  if (frameless) {
    return <div className="d-grid gap-3">{content}</div>
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>{title}</span>
        {!compact && confirmed && onChangePeriod && (
          <CButton color="light" size="sm" onClick={onChangePeriod}>
            Change
          </CButton>
        )}
      </CCardHeader>
      <CCardBody className="d-grid gap-3">{content}</CCardBody>
    </CCard>
  )
}

export default ClaimPeriodSection
