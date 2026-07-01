import React from 'react'
import { CButton } from '@coreui/react'
import { ClipboardList } from 'lucide-react'
import OnboardingBilingualText, {
  formatOnboardingCopyInline,
} from 'src/components/onboarding/OnboardingBilingualText'

const OnboardingTourPrompt = ({
  copy,
  locale,
  notReady,
  onDismiss,
  onRetry,
  onStart,
  showPreparing,
}) => (
  <div className="onboarding-tour-prompt rounded border bg-body shadow-sm p-3">
    <div className="d-flex align-items-start gap-2">
      <ClipboardList size={18} className="text-primary flex-shrink-0 mt-1" aria-hidden="true" />
      <div className="min-w-0">
        {showPreparing ? (
          <>
            <OnboardingBilingualText
              value={copy.preparingTitle}
              locale={locale}
              className="fw-semibold"
            />
            <OnboardingBilingualText
              value={copy.preparingBody}
              locale={locale}
              className="text-body-secondary"
            />
          </>
        ) : notReady ? (
          <>
            <OnboardingBilingualText
              value={copy.notReadyTitle}
              locale={locale}
              className="fw-semibold"
            />
            <OnboardingBilingualText
              value={copy.notReadyBody}
              locale={locale}
              className="text-body-secondary"
            />
            <div className="d-flex flex-wrap gap-2 mt-3">
              <CButton color="primary" size="sm" onClick={onRetry}>
                {formatOnboardingCopyInline(copy.retryLabel, locale)}
              </CButton>
              <CButton color="secondary" variant="outline" size="sm" onClick={onDismiss}>
                {formatOnboardingCopyInline(copy.skipLabel, locale)}
              </CButton>
            </div>
          </>
        ) : (
          <>
            <OnboardingBilingualText value={copy.title} locale={locale} className="fw-semibold" />
            <OnboardingBilingualText
              value={copy.body}
              locale={locale}
              className="text-body-secondary"
            />
            <div className="d-flex flex-wrap gap-2 mt-3">
              <CButton color="primary" size="sm" onClick={onStart}>
                {formatOnboardingCopyInline(copy.startLabel, locale)}
              </CButton>
              <CButton color="secondary" variant="outline" size="sm" onClick={onDismiss}>
                {formatOnboardingCopyInline(copy.skipLabel, locale)}
              </CButton>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
)

export default OnboardingTourPrompt
