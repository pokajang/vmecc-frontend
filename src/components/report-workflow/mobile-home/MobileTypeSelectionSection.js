import React from 'react'
import MobileChoiceList from 'src/components/report-workflow/MobileChoiceList'
import MobileWorkflowSection from './MobileWorkflowSection'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

export const MOBILE_TYPE_TOGGLE_CARD_PROPS = {
  style: {
    backgroundColor: 'var(--cui-light-bg-subtle, #f8f9fa)',
    borderColor: 'var(--cui-border-color, #d8dbe0)',
    borderStyle: 'dashed',
  },
  className: 'text-primary',
  iconContainerClassName: 'bg-transparent text-primary',
  iconContainerSize: 20,
  iconSize: 16,
  titleClassName: 'fw-semibold text-primary',
  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
}

const MobileTypeSelectionSection = ({
  title,
  titleId,
  headerAction = null,
  options = [],
  value = '',
  onChange,
  toggleValue = '',
  mode = 'action',
  showDescriptions = false,
  listProps = {},
  className = '',
  ...sectionProps
}) => {
  return (
    <MobileWorkflowSection
      {...sectionProps}
      title={title}
      titleId={titleId}
      header
      headerAction={headerAction}
      className={className}
    >
      <MobileChoiceList
        {...listProps}
        mode={mode}
        options={options}
        value={value}
        onChange={onChange}
        toggleValue={toggleValue}
        ariaLabel={listProps.ariaLabel || title}
        showDescriptions={showDescriptions}
        className={buildClassName('mobile-workflow-home__type-list', listProps.className)}
      />
    </MobileWorkflowSection>
  )
}

export default MobileTypeSelectionSection
