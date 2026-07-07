import React from 'react'
import { CButton, CCol, CRow } from '@coreui/react'
import { Pencil, RotateCcw } from 'lucide-react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import { OptionMetaLabel } from 'src/components/IconOptionGrid'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const sanitizeSegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const InspectionMobileCollapsedSelectorRow = ({
  label,
  value,
  metaIconKey = '',
  metaLabel = '',
  metaTone = '',
  editLabel,
  editIcon = null,
  resetLabel,
  resetIcon = null,
  extraAction = null,
  onEdit,
  onReset,
  className = '',
}) => {
  if (!String(value || '').trim()) return null

  return (
    <div
      className={buildClassName(
        'inspection-mobile-selector-row d-flex align-items-center justify-content-between gap-3',
        className,
      )}
    >
      <div
        className="inspection-mobile-selector-chip rounded-3 border border-primary bg-primary bg-opacity-10"
        role="group"
        aria-label={label}
      >
        <span className="inspection-mobile-selector-chip__section-label small text-muted">
          {label}
        </span>
        <span className="inspection-mobile-selector-chip__label fw-semibold d-inline-flex flex-wrap align-items-center gap-2">
          <span className="text-truncate">{value}</span>
          {metaLabel ? (
            <OptionMetaLabel iconKey={metaIconKey} label={metaLabel} tone={metaTone} />
          ) : null}
        </span>
        <span className="inspection-mobile-selector-chip__actions d-inline-flex align-items-center gap-1">
          {extraAction}
          {typeof onReset === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="inspection-mobile-selector-chip__reset p-1 border-0 shadow-none"
              aria-label={resetLabel || `Reset ${label}`}
              title={resetLabel || `Reset ${label}`}
              onClick={onReset}
            >
              {resetIcon || <RotateCcw size={15} />}
            </CButton>
          ) : null}
          {typeof onEdit === 'function' ? (
            <CButton
              type="button"
              color="primary"
              variant="ghost"
              size="sm"
              className="inspection-mobile-selector-chip__edit p-1 border-0 shadow-none"
              aria-label={editLabel || `Edit ${label}`}
              title={editLabel || `Edit ${label}`}
              onClick={onEdit}
            >
              {editIcon || <Pencil size={15} />}
            </CButton>
          ) : null}
        </span>
      </div>
    </div>
  )
}

export const InspectionMobileSetupDrawer = ({
  visible,
  title,
  headerAction = null,
  children,
  onClose,
  className = '',
  bodyClassName = '',
}) => (
  <MobileBottomDrawer
    visible={visible}
    title={title}
    headerAction={headerAction}
    onClose={onClose}
    className={className}
    bodyClassName={bodyClassName}
  >
    {children}
  </MobileBottomDrawer>
)

export const InspectionMobileSelectorButtonGrid = ({
  options = [],
  value,
  onChange,
  columns = { xs: 6, md: 3 },
  getOptionKey,
  testIdPrefix = '',
  disabled = false,
}) => {
  if (!Array.isArray(options) || options.length === 0) return null

  return (
    <CRow className="g-2" role="radiogroup">
      {options.map((option) => {
        const optionValue = option?.value
        const optionTitle = option?.title || option?.label || String(optionValue || '')
        const optionMetaLabel = String(option?.metaLabel || '').trim()
        const OptionIcon = option?.icon
        const isSelected = value === optionValue
        const isDisabled = disabled || Boolean(option?.disabled)
        const key =
          (typeof getOptionKey === 'function' ? getOptionKey(option) : undefined) || optionValue
        const testId =
          option?.testId ||
          (testIdPrefix
            ? `${testIdPrefix}-${sanitizeSegment(optionValue || optionTitle)}`
            : undefined)

        return (
          <CCol key={String(key)} {...(option?.columns || columns)}>
            <CButton
              type="button"
              color={isSelected ? 'primary' : 'light'}
              variant={isSelected ? undefined : 'outline'}
              className={buildClassName(
                'inspection-mobile-selector-btn d-flex align-items-center w-100 text-start justify-content-start gap-2 rounded-3',
                isSelected ? 'inspection-mobile-selector-btn--selected' : '',
              )}
              disabled={isDisabled}
              role="radio"
              aria-checked={isSelected}
              data-testid={testId}
              onClick={() => {
                if (!isDisabled && typeof onChange === 'function') {
                  onChange(optionValue, option)
                }
              }}
            >
              {OptionIcon ? (
                <span
                  className="inspection-mobile-selector-btn__icon d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  aria-label={`${optionTitle} icon`}
                >
                  <OptionIcon size={16} aria-hidden="true" />
                </span>
              ) : null}
              <span className="inspection-option-title-with-meta flex-grow-1">
                <span className="inspection-option-title text-truncate">{optionTitle}</span>
                {optionMetaLabel ? (
                  <OptionMetaLabel
                    iconKey={option?.metaIconKey}
                    label={optionMetaLabel}
                    tone={option?.metaTone}
                  />
                ) : null}
              </span>
            </CButton>
          </CCol>
        )
      })}
    </CRow>
  )
}
