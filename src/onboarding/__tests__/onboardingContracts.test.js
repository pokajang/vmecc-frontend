import { describe, expect, it } from 'vitest'

import { inspectionQuickTour } from '../inspectionQuickTourConfig'
import { leaveManagementQuickTour } from '../leaveManagementQuickTourConfig'
import { myLeaveQuickTour } from '../myLeaveQuickTourConfig'
import { myOvertimeQuickTour } from '../myOvertimeQuickTourConfig'
import { overtimeManagementQuickTour } from '../overtimeManagementQuickTourConfig'
import { payrollClaimsQuickTour } from '../payrollClaimsQuickTourConfig'
import { rosterManagementQuickTour } from '../rosterManagementQuickTourConfig'
import { salaryClaimsManagementQuickTour } from '../salaryClaimsManagementQuickTourConfig'
import { staffDirectoryQuickTour } from '../staffDirectoryQuickTourConfig'
import { teamDirectoryQuickTour } from '../teamDirectoryQuickTourConfig'
import { usersQuickTour } from '../usersQuickTourConfig'
import {
  INSPECTION_TOUR_SOURCE_DEFAULTS,
  INSPECTION_TOUR_SOURCE_REQUEST,
  INSPECTION_TOUR_SOURCE_REPLAY,
  INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
} from '../inspectionOnboardingContract'
import {
  assertValidTourConfig,
  assertValidTutorialHubItem,
  assertValidTutorialRegistryEntry,
} from '../onboardingContracts'
import { getVisibleTutorialHubItems } from '../tutorialRegistry'

const completeTrtUser = {
  id: 12,
  name: 'TRT User',
  roles: ['Tactical Response Team'],
  permissions: ['reports.inspection.view', 'reports.erco.view'],
  ic_number: '900101-10-1234',
  phone: '012 345 6789',
  address: 'Lot 1',
  state: 'Selangor',
  emergency_contact: {
    name: 'Emergency Contact',
    relationship: 'Sibling',
    phone: '013 345 6789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

describe('onboardingContracts', () => {
  it('accepts the Inspection tour config and stable source identifiers', () => {
    expect(assertValidTourConfig(inspectionQuickTour, 'inspectionQuickTour')).toBe(true)
    expect(assertValidTourConfig(leaveManagementQuickTour, 'leaveManagementQuickTour')).toBe(true)
    expect(assertValidTourConfig(myLeaveQuickTour, 'myLeaveQuickTour')).toBe(true)
    expect(assertValidTourConfig(myOvertimeQuickTour, 'myOvertimeQuickTour')).toBe(true)
    expect(assertValidTourConfig(overtimeManagementQuickTour, 'overtimeManagementQuickTour')).toBe(
      true,
    )
    expect(assertValidTourConfig(payrollClaimsQuickTour, 'payrollClaimsQuickTour')).toBe(true)
    expect(assertValidTourConfig(teamDirectoryQuickTour, 'teamDirectoryQuickTour')).toBe(true)
    expect(assertValidTourConfig(rosterManagementQuickTour, 'rosterManagementQuickTour')).toBe(true)
    expect(
      assertValidTourConfig(salaryClaimsManagementQuickTour, 'salaryClaimsManagementQuickTour'),
    ).toBe(true)
    expect(assertValidTourConfig(staffDirectoryQuickTour, 'staffDirectoryQuickTour')).toBe(true)
    expect(assertValidTourConfig(usersQuickTour, 'usersQuickTour')).toBe(true)
    expect(INSPECTION_TOUR_SOURCE_DEFAULTS).toEqual({
      prompt: 'inspection_prompt',
      request: INSPECTION_TOUR_SOURCE_REQUEST,
      replay: INSPECTION_TOUR_SOURCE_REPLAY,
      tutorialHub: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
    })
  })

  it('fails clearly when a tour step contract is malformed', () => {
    const invalidConfig = {
      ...inspectionQuickTour,
      steps: [
        {
          ...inspectionQuickTour.steps[0],
          targetSelector: '',
        },
      ],
    }

    expect(() => assertValidTourConfig(invalidConfig, 'invalidInspectionTour')).toThrow(
      '[onboarding-contract] invalidInspectionTour.steps[0].targetSelector must be a non-empty string',
    )
  })

  it('fails clearly when route patterns are missing or malformed', () => {
    expect(() =>
      assertValidTourConfig(
        {
          ...inspectionQuickTour,
          routePattern: null,
        },
        'invalidRoutePatternTour',
      ),
    ).toThrow(
      '[onboarding-contract] invalidRoutePatternTour.routePattern must be a regular expression',
    )
  })

  it('fails clearly when a localized hub item does not actually provide localized copy', () => {
    expect(() =>
      assertValidTutorialHubItem(
        {
          moduleId: 'inspection',
          localized: true,
          label: 'Inspection',
          description: 'Inspection tutorial',
          status: 'ready',
          actionLabel: 'Start',
          actionType: 'start',
          replayEvent: 'inspection:replay',
        },
        'inspectionHubItem',
      ),
    ).toThrow(
      '[onboarding-contract] inspectionHubItem.localized=true requires localized display copy',
    )
  })

  it('accepts a valid localized registry entry', () => {
    expect(
      assertValidTutorialRegistryEntry(
        {
          moduleId: 'inspection',
          localized: true,
          label: { en: 'Inspection', bm: 'Pemeriksaan' },
          description: { en: 'Inspection tutorial', bm: 'Tutorial pemeriksaan' },
          route: '/inspection',
          visible: () => true,
          resolveHubState: () => ({
            status: 'ready',
            actionLabel: { en: 'Start', bm: 'Mula' },
            actionType: 'start',
          }),
          tourConfig: inspectionQuickTour,
        },
        'inspectionRegistryEntry',
      ),
    ).toBe(true)
  })

  it('marks localization explicitly on visible hub items instead of inferring it from strings', () => {
    const items = getVisibleTutorialHubItems(completeTrtUser)

    expect(items.find((item) => item.moduleId === 'inspection')?.localized).toBe(true)
    expect(items.find((item) => item.moduleId === 'erco')?.localized).toBe(false)
  })
})
