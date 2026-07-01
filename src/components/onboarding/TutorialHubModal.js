import React from 'react'
import { CBadge, CButton, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LayoutGrid,
  MessageSquareText,
  Settings,
  TriangleAlert,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from 'lucide-react'

import OnboardingBilingualText, {
  formatOnboardingCopyInline,
  getOnboardingCopyA11yLabel,
} from 'src/components/onboarding/OnboardingBilingualText'
import OnboardingLanguageSelector from 'src/components/onboarding/OnboardingLanguageSelector'
import MobileOverlayShell from 'src/components/header/MobileOverlayShell'
import MobileOverlayItem from 'src/components/header/MobileOverlayItem'
import MobileOverlaySection from 'src/components/header/MobileOverlaySection'
import useMediaQuery from 'src/hooks/useMediaQuery'
import {
  assertValidTutorialHubItem,
  validateOnboardingContract,
} from 'src/onboarding/onboardingContracts'
import { useOnboardingLocale } from 'src/onboarding/onboardingLocale'
import {
  ONBOARDING_TELEMETRY_EVENTS,
  trackOnboardingTelemetry,
} from 'src/onboarding/onboardingTelemetry'
import { TUTORIAL_HUB_SOURCE } from 'src/onboarding/tutorialRegistry'

const moduleIcons = {
  audit: ClipboardList,
  dashboard: LayoutDashboard,
  drill: Wrench,
  erco: TriangleAlert,
  fitness_test: Dumbbell,
  inspection: ClipboardList,
  leave: CalendarDays,
  leave_management: CalendarDays,
  messages: MessageSquareText,
  my_leave: CalendarDays,
  my_overtime: CalendarDays,
  overtime: CalendarDays,
  overtime_management: CalendarDays,
  payroll: Wallet,
  payroll_claims: Wallet,
  roster: LayoutGrid,
  roster_management: LayoutGrid,
  salary_claims: Wallet,
  salary_claims_management: Wallet,
  settings: Settings,
  staff: UserRound,
  staff_directory: UserRound,
  team: UsersRound,
  team_directory: UsersRound,
  users: Users,
}

const TutorialHubModal = ({
  visible,
  onClose,
  onNavigate,
  tutorials = [],
  user,
  returnFocusRef,
}) => {
  const isMobileOverlay = useMediaQuery('(max-width: 767.98px)')
  const { locale, setLocale } = useOnboardingLocale()
  const visibleTutorials = tutorials.filter((tutorial, index) =>
    validateOnboardingContract(
      assertValidTutorialHubItem,
      tutorial,
      `TutorialHubModal.tutorials[${index}]`,
    ),
  )
  const localizedTutorial = visibleTutorials.find((tutorial) => tutorial.localized === true) || null
  const hasLocalizedTutorial = Boolean(localizedTutorial)

  const handleAction = (tutorial) => {
    if (tutorial?.actionType === 'navigate' && tutorial.actionTo) {
      onClose?.()
      window.setTimeout(() => {
        onNavigate?.(tutorial.actionTo)
      }, 0)
      return
    }

    if (tutorial?.actionType !== 'start' || !tutorial?.replayEvent || !user?.id) return

    onClose?.()
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(tutorial.replayEvent, {
          detail: {
            source: tutorial.source || TUTORIAL_HUB_SOURCE,
            userId: user.id,
          },
        }),
      )
    }, 0)
  }

  const handleLocaleChange = (nextLocale) => {
    setLocale(nextLocale)
    trackOnboardingTelemetry(ONBOARDING_TELEMETRY_EVENTS.hubLanguageChanged, {
      detail: { nextLocale },
      locale: nextLocale,
      moduleId: localizedTutorial?.moduleId || null,
      source: localizedTutorial?.source || TUTORIAL_HUB_SOURCE,
    })
  }

  const languageSelector = hasLocalizedTutorial ? (
    <OnboardingLanguageSelector locale={locale} onChange={handleLocaleChange} />
  ) : null

  const renderTutorialList = (mobile = false) =>
    visibleTutorials.length > 0 ? (
      <>
        {mobile && <MobileOverlaySection>Modules</MobileOverlaySection>}
        <div className={mobile ? 'mobile-overlay-list' : 'd-grid gap-2'}>
          {visibleTutorials.map((tutorial) => {
            const Icon = moduleIcons[tutorial.moduleId] || ClipboardList
            const ready = tutorial.status === 'ready'
            const statusLabel =
              tutorial.statusLabel || (tutorial.status === 'coming_soon' ? 'Coming soon' : null)
            const actionLabel =
              tutorial.actionLabel || (ready ? 'Start' : statusLabel || 'Unavailable')
            const actionLabelText = formatOnboardingCopyInline(actionLabel, locale)
            const disabled = tutorial.actionType === 'disabled' || !tutorial.actionType

            if (mobile) {
              return (
                <MobileOverlayItem
                  key={tutorial.moduleId}
                  as="div"
                  icon={<Icon size={18} aria-hidden="true" />}
                  label={
                    <OnboardingBilingualText
                      value={tutorial.label}
                      locale={locale}
                      className="gap-1"
                    />
                  }
                  subtext={
                    <OnboardingBilingualText
                      value={tutorial.description}
                      locale={locale}
                      className="gap-1"
                    />
                  }
                  badge={
                    statusLabel ? (
                      <CBadge color="secondary" className="fw-normal mobile-overlay-chip">
                        {statusLabel}
                      </CBadge>
                    ) : null
                  }
                  action={
                    <CButton
                      className="mobile-overlay-action-button"
                      color={ready ? 'primary' : 'secondary'}
                      size="sm"
                      variant={ready ? undefined : 'outline'}
                      disabled={disabled}
                      aria-label={getOnboardingCopyA11yLabel(actionLabel, locale)}
                      onClick={() => handleAction(tutorial)}
                    >
                      {actionLabelText}
                    </CButton>
                  }
                />
              )
            }

            return (
              <div
                key={tutorial.moduleId}
                className="onboarding-hub-row rounded border p-3 d-flex align-items-start gap-3"
              >
                <span className="onboarding-hub-row-icon text-primary flex-shrink-0">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-grow-1">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <OnboardingBilingualText
                      value={tutorial.label}
                      locale={locale}
                      className="fw-semibold"
                    />
                    {statusLabel ? (
                      <CBadge color="secondary" className="fw-normal mobile-overlay-chip">
                        {statusLabel}
                      </CBadge>
                    ) : null}
                  </div>
                  <OnboardingBilingualText
                    value={tutorial.description}
                    locale={locale}
                    className="small text-body-secondary mt-1"
                  />
                </div>
                <CButton
                  className="flex-shrink-0 mobile-overlay-action-button"
                  color={ready ? 'primary' : 'secondary'}
                  size="sm"
                  variant={ready ? undefined : 'outline'}
                  disabled={disabled}
                  aria-label={getOnboardingCopyA11yLabel(actionLabel, locale)}
                  onClick={() => handleAction(tutorial)}
                >
                  {actionLabelText}
                </CButton>
              </div>
            )
          })}
        </div>
      </>
    ) : (
      <div className={mobile ? 'mobile-overlay-empty' : 'rounded border p-3 text-body-secondary'}>
        No tutorials are available for your current access.
      </div>
    )

  if (isMobileOverlay) {
    return (
      <MobileOverlayShell
        open={visible}
        title="Tutorial"
        onClose={onClose}
        returnFocusRef={returnFocusRef}
        className="mobile-tutorial-sheet"
        bodyClassName="mobile-tutorial-sheet-body"
        headerActions={languageSelector}
      >
        {renderTutorialList(true)}
      </MobileOverlayShell>
    )
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      fullscreen="sm"
      scrollable
      aria-label="Tutorial"
    >
      <CModalHeader className="onboarding-hub-header">
        <CModalTitle>Tutorial</CModalTitle>
        {languageSelector}
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <p className="text-body-secondary mb-0">Choose a module to learn the main controls.</p>
        {renderTutorialList(false)}
      </CModalBody>
    </CModal>
  )
}

export default TutorialHubModal
