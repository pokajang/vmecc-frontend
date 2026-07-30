import React from 'react'
import MobileChoiceList from 'src/components/report-workflow/MobileChoiceList'
import MobileSetupSummaryRow from 'src/components/report-workflow/MobileSetupSummaryRow'
import MobileSetupSelectorDrawer from 'src/components/report-workflow/MobileSetupSelectorDrawer'
import { OptionMetaLabel } from 'src/components/IconOptionGrid'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

export const InspectionMobileCollapsedSelectorRow = ({
  label,
  value,
  secondaryValue = '',
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
        'inspection-mobile-selector-row mobile-setup-summary-row',
        className,
      )}
    >
      <MobileSetupSummaryRow
        label={label}
        value={value}
        secondaryValue={secondaryValue}
        meta={
          metaLabel ? (
            <OptionMetaLabel iconKey={metaIconKey} label={metaLabel} tone={metaTone} />
          ) : null
        }
        extraAction={extraAction}
        editLabel={editLabel}
        editIcon={editIcon}
        resetLabel={resetLabel}
        resetIcon={resetIcon}
        onEdit={onEdit}
        onReset={onReset}
      />
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
  <MobileSetupSelectorDrawer
    visible={visible}
    title={title}
    headerAction={headerAction}
    onClose={onClose}
    className={className}
    bodyClassName={bodyClassName}
  >
    {children}
  </MobileSetupSelectorDrawer>
)

export const InspectionMobileChoiceList = ({
  options = [],
  value,
  onChange,
  getOptionKey,
  testIdPrefix = '',
  disabled = false,
  toggleValue = '',
  ariaLabel = 'Choose an option',
  showDescription = true,
}) => {
  if (!Array.isArray(options) || options.length === 0) return null

  return (
    <MobileChoiceList
      className="inspection-mobile-selector-list"
      mode="single"
      options={options}
      value={value}
      onChange={onChange}
      toggleValue={toggleValue}
      getOptionKey={getOptionKey}
      testIdPrefix={testIdPrefix}
      disabled={disabled}
      ariaLabel={ariaLabel}
      showDescriptions={showDescription}
    />
  )
}
