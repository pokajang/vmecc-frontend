import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'

import OnboardingTourRunner from 'src/components/onboarding/OnboardingTourRunner'
import { getReadyTourConfigs } from 'src/onboarding/tutorialRegistry'
import useOnboardingVisibilityOptions from 'src/onboarding/useOnboardingVisibilityOptions'

const OnboardingTourHost = () => {
  const authUser = useSelector((state) => state.authUser)
  const visibilityOptions = useOnboardingVisibilityOptions()
  const tourConfigs = useMemo(
    () => getReadyTourConfigs(authUser, visibilityOptions),
    [authUser, visibilityOptions],
  )

  return (
    <>
      {tourConfigs.map((config) => (
        <OnboardingTourRunner key={config.id} config={config} />
      ))}
    </>
  )
}

export default OnboardingTourHost
