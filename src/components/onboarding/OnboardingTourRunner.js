import React, { useMemo } from 'react'
import { Joyride } from 'react-joyride'

import OnboardingTourPrompt from 'src/components/onboarding/OnboardingTourPrompt'
import OnboardingTourTooltip from 'src/components/onboarding/OnboardingTourTooltip'
import {
  assertValidTourConfig,
  validateOnboardingContract,
} from 'src/onboarding/onboardingContracts'
import { useOnboardingLocale } from 'src/onboarding/onboardingLocale'
import { useOnboardingTourRunner } from 'src/onboarding/useOnboardingTourRunner'
import { TOUR_LAYER_Z_INDEX, TOUR_SCROLL_OFFSET } from 'src/onboarding/tourRuntime'

const OnboardingTourRunner = ({ config }) => {
  const { locale } = useOnboardingLocale()
  const isValidConfig = useMemo(
    () =>
      validateOnboardingContract(
        assertValidTourConfig,
        config,
        `OnboardingTourRunner(${config?.id || 'unknown'})`,
      ),
    [config],
  )
  const {
    authUser,
    dismissTour,
    eligibility,
    handleJoyrideEvent,
    notReady,
    promptVisible,
    run,
    showPreparing,
    startTour,
    steps,
    tourRunId,
    tourSource,
  } = useOnboardingTourRunner(config, { locale, isValidConfig })

  if (!isValidConfig || !authUser?.id || !eligibility.eligible) return null

  return (
    <>
      {promptVisible ? (
        <OnboardingTourPrompt
          copy={config.prompt}
          locale={locale}
          notReady={notReady}
          onDismiss={() => dismissTour({ reason: 'skip' })}
          onRetry={() =>
            startTour({
              bypassSuppression: true,
              source: tourSource,
            })
          }
          onStart={() =>
            startTour({
              source: config.sourceDefaults?.prompt || tourSource,
            })
          }
          showPreparing={showPreparing}
        />
      ) : null}
      <Joyride
        continuous
        disableOverlayClose
        key={tourRunId}
        onEvent={handleJoyrideEvent}
        run={run}
        scrollOffset={TOUR_SCROLL_OFFSET}
        scrollToFirstStep
        showProgress={false}
        showSkipButton
        steps={steps}
        styles={{
          options: {
            arrowColor: 'var(--cui-body-bg)',
            overlayColor: 'rgba(33, 37, 41, 0.45)',
            primaryColor: 'var(--cui-primary)',
            zIndex: TOUR_LAYER_Z_INDEX,
          },
        }}
        tooltipComponent={(props) => <OnboardingTourTooltip {...props} locale={locale} />}
      />
    </>
  )
}

export default OnboardingTourRunner
