import React from 'react'
import { CButton } from '@coreui/react'
import { RotateCcw } from 'lucide-react'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import MobileSetupSummaryList from './MobileSetupSummaryList'
import WorkflowSetupField from './WorkflowSetupField'

const ResponsiveSetupSummaryField = ({
  label,
  value,
  secondaryValue = '',
  onEdit,
  onReset,
  editLabel,
  resetLabel,
  ariaLabel,
  showDesktop = true,
  className = '',
  desktopClassName = '',
}) => {
  const isMobile = useReportIsMobile()

  if (!isMobile && !showDesktop) return null

  if (!isMobile) {
    return (
      <WorkflowSetupField
        label={label}
        value={value || '--'}
        secondaryValue={secondaryValue}
        onEdit={onEdit}
        onReset={onReset}
        editLabel={editLabel}
        resetLabel={resetLabel}
        ariaLabel={ariaLabel}
        className={desktopClassName}
      />
    )
  }

  return (
    <div
      className={['responsive-setup-summary-field', 'd-md-none', className]
        .filter(Boolean)
        .join(' ')}
    >
      <MobileSetupSummaryList
        ariaLabel={ariaLabel || label}
        items={[
          {
            key: label,
            label,
            value: value || '--',
            secondaryValue,
            onEdit,
            editLabel,
            extraAction:
              typeof onReset === 'function' ? (
                <CButton
                  type="button"
                  color="primary"
                  variant="ghost"
                  size="sm"
                  className="mobile-setup-summary__action mobile-setup-summary__reset"
                  aria-label={resetLabel || `Reset ${label}`}
                  title={resetLabel || `Reset ${label}`}
                  onClick={onReset}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </CButton>
              ) : null,
          },
        ]}
      />
    </div>
  )
}

export default ResponsiveSetupSummaryField
