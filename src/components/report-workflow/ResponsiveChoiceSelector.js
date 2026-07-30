import React from 'react'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileChoiceList from './MobileChoiceList'

const ResponsiveChoiceSelector = ({
  isMobile,
  options = [],
  value,
  onChange,
  selectionMode = 'single',
  ariaLabel,
  testIdPrefix = '',
  toggleValue = '',
  disabled = false,
  getOptionKey,
  emptyState = null,
  mobileClassName = '',
  mobileShowDescriptions,
  mobileFooterAction = null,
  variant = 'compact',
  showDescription = true,
  columns = { xs: 12, md: 3 },
  rowClassName,
  cardProps = {},
}) => {
  if (isMobile) {
    return (
      <MobileChoiceList
        mode={selectionMode === 'multi' ? 'multiple' : selectionMode}
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
        testIdPrefix={testIdPrefix}
        toggleValue={toggleValue}
        disabled={disabled}
        getOptionKey={getOptionKey}
        emptyState={emptyState}
        className={mobileClassName}
        showDescriptions={mobileShowDescriptions ?? showDescription}
        footerAction={mobileFooterAction}
      />
    )
  }

  return (
    <IconOptionGrid
      options={options}
      value={value}
      onChange={onChange}
      selectionMode={selectionMode}
      ariaLabel={ariaLabel}
      testIdPrefix={testIdPrefix}
      disabled={disabled}
      getOptionKey={getOptionKey}
      emptyState={emptyState}
      variant={variant}
      showDescription={showDescription}
      columns={columns}
      rowClassName={rowClassName}
      cardProps={cardProps}
    />
  )
}

export default ResponsiveChoiceSelector
