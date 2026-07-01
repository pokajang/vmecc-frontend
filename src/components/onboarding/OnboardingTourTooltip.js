import React from 'react'
import { CButton } from '@coreui/react'
import { X } from 'lucide-react'
import OnboardingBilingualText, {
  formatOnboardingCopyInline,
  getOnboardingCopyText,
} from 'src/components/onboarding/OnboardingBilingualText'

const OnboardingTourTooltip = ({
  backProps,
  closeProps,
  continuous,
  index,
  locale,
  primaryProps,
  skipProps,
  size,
  step,
  tooltipProps,
}) => {
  const isLastStep = index + 1 >= size
  const stepProgress = {
    en: `Step ${index + 1} of ${size}`,
    bm: `Langkah ${index + 1} daripada ${size}`,
  }
  const nextLabel =
    step.onPrimaryAction && step.primaryActionLabel
      ? step.primaryActionLabel
      : isLastStep
        ? { en: 'Done', bm: 'Selesai' }
        : { en: 'Next', bm: 'Seterusnya' }
  const handlePrimaryAction = (event) => {
    if (step.onPrimaryAction) {
      step.onPrimaryAction(event)
      return
    }

    primaryProps?.onClick?.(event)
  }

  return (
    <div
      {...tooltipProps}
      className="onboarding-tour-tooltip rounded border bg-body shadow"
      role="dialog"
      aria-label={getOnboardingCopyText(step.title, locale)}
    >
      <div className="d-grid gap-3 p-3">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="min-w-0">
            <OnboardingBilingualText value={step.title} locale={locale} className="fw-semibold" />
            <OnboardingBilingualText
              value={stepProgress}
              locale={locale}
              className="text-body-secondary small mt-1"
            />
          </div>
          <CButton
            {...closeProps}
            type="button"
            color="secondary"
            variant="ghost"
            size="sm"
            className="p-1 flex-shrink-0"
            aria-label={formatOnboardingCopyInline(
              { en: 'Close tour', bm: 'Tutup tutorial' },
              locale,
            )}
          >
            <X size={18} aria-hidden="true" />
          </CButton>
        </div>
        <OnboardingBilingualText
          as="p"
          value={step.content}
          locale={locale}
          className="mb-0 text-body-secondary"
          itemClassName="onboarding-bilingual-text__content"
        />
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <CButton {...skipProps} type="button" color="secondary" variant="ghost">
            {formatOnboardingCopyInline({ en: 'Skip', bm: 'Langkau' }, locale)}
          </CButton>
          <div className="d-flex flex-wrap align-items-center gap-2">
            {index > 0 ? (
              <CButton {...backProps} type="button" color="secondary" variant="outline">
                {formatOnboardingCopyInline({ en: 'Back', bm: 'Kembali' }, locale)}
              </CButton>
            ) : null}
            {continuous ? (
              <CButton
                {...primaryProps}
                type="button"
                color="primary"
                aria-label={formatOnboardingCopyInline(nextLabel, locale)}
                onClick={handlePrimaryAction}
              >
                {formatOnboardingCopyInline(nextLabel, locale)}
              </CButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTourTooltip
