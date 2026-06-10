import React from 'react'
import { CCol, CRow } from '@coreui/react'
import IconOptionCard from 'src/components/IconOptionCard'

const sanitizeSegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const resolveCardProps = (cardProps, option, isSelected) =>
  typeof cardProps === 'function' ? cardProps(option, isSelected) || {} : cardProps || {}

const isOptionSelected = (value, optionValue) => {
  if (Array.isArray(value)) return value.includes(optionValue)
  return value === optionValue
}

const IconOptionGrid = ({
  options = [],
  value,
  onChange,
  variant = 'standard',
  fallbackIcon = null,
  showDescription = true,
  columns = { xs: 12, md: 4 },
  rowClassName = 'g-2 g-md-3',
  emptyState = null,
  cardProps = {},
  getOptionKey,
  disabled = false,
  ariaLabel,
  testIdPrefix = '',
}) => {
  if (!Array.isArray(options) || options.length === 0) {
    return emptyState || null
  }

  return (
    <CRow className={rowClassName} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const optionValue = option?.value
        const optionTitle = option?.title || option?.label || String(optionValue || '')
        const optionDescription = option?.description || ''
        const optionIcon = option?.icon
        const isSelected = isOptionSelected(value, optionValue)
        const isDisabled = disabled || Boolean(option?.disabled)
        const resolved = resolveCardProps(cardProps, option, isSelected)
        const colProps = option?.columns || columns
        const key =
          (typeof getOptionKey === 'function' ? getOptionKey(option) : undefined) || optionValue
        const testId =
          option?.testId ||
          (testIdPrefix
            ? `${testIdPrefix}-${sanitizeSegment(optionValue || optionTitle)}`
            : undefined)

        return (
          <CCol key={String(key)} {...colProps}>
            <IconOptionCard
              title={optionTitle}
              description={optionDescription}
              icon={optionIcon}
              fallbackIcon={option?.fallbackIcon || fallbackIcon}
              selected={isSelected}
              disabled={isDisabled}
              showDescription={showDescription}
              variant={option?.variant || variant}
              testId={testId}
              onSelect={() => {
                if (typeof onChange !== 'function') return
                onChange(optionValue, option)
              }}
              {...resolved}
            />
          </CCol>
        )
      })}
    </CRow>
  )
}

export default IconOptionGrid
