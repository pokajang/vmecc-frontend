import { auditQuickTour } from 'src/onboarding/auditQuickTourConfig'
import { dashboardQuickTour } from 'src/onboarding/dashboardQuickTourConfig'
import { drillQuickTour } from 'src/onboarding/drillQuickTourConfig'
import { ercoQuickTour } from 'src/onboarding/ercoQuickTourConfig'
import { fitnessTestQuickTour } from 'src/onboarding/fitnessTestQuickTourConfig'
import { inspectionQuickTour } from 'src/onboarding/inspectionQuickTourConfig'
import { leaveManagementQuickTour } from 'src/onboarding/leaveManagementQuickTourConfig'
import { myLeaveQuickTour } from 'src/onboarding/myLeaveQuickTourConfig'
import { myOvertimeQuickTour } from 'src/onboarding/myOvertimeQuickTourConfig'
import { overtimeManagementQuickTour } from 'src/onboarding/overtimeManagementQuickTourConfig'
import { payrollClaimsQuickTour } from 'src/onboarding/payrollClaimsQuickTourConfig'
import { usersQuickTour } from 'src/onboarding/usersQuickTourConfig'
import { rosterManagementQuickTour } from 'src/onboarding/rosterManagementQuickTourConfig'
import { salaryClaimsManagementQuickTour } from 'src/onboarding/salaryClaimsManagementQuickTourConfig'
import { settingsQuickTour } from 'src/onboarding/settingsQuickTourConfig'
import { staffDirectoryQuickTour } from 'src/onboarding/staffDirectoryQuickTourConfig'
import { teamDirectoryQuickTour } from 'src/onboarding/teamDirectoryQuickTourConfig'
import { messagesQuickTour } from 'src/onboarding/messagesQuickTourConfig'
import {
  assertValidTutorialRegistryEntry,
  assertValidTourConfig,
  assertValidTutorialHubItem,
  validateOnboardingContract,
} from 'src/onboarding/onboardingContracts'
import { INSPECTION_TOUR_SOURCE_DEFAULTS } from 'src/onboarding/inspectionOnboardingContract'
import { hasAnyPermission, hasPermission } from 'src/utils/authz'
import { isModuleEnabled } from 'src/utils/modules'

export const TUTORIAL_HUB_SOURCE = INSPECTION_TOUR_SOURCE_DEFAULTS.tutorialHub

const getReadyTutorialHubState = (tourConfig, user, actionLabel = 'Start') => {
  if (tourConfig.canLaunch(user).eligible) {
    return {
      status: 'ready',
      actionLabel,
      actionType: 'start',
    }
  }

  return {
    status: 'hidden',
    statusLabel: 'Unavailable',
    actionLabel: 'Unavailable',
    actionType: 'disabled',
  }
}

const getInspectionTutorialHubState = (user) =>
  getReadyTutorialHubState(inspectionQuickTour, user, {
    en: 'Start',
    bm: 'Mula',
  })

const getAuditTutorialHubState = (user) => getReadyTutorialHubState(auditQuickTour, user)
const getDashboardTutorialHubState = (user) => getReadyTutorialHubState(dashboardQuickTour, user)
const getDrillTutorialHubState = (user) => getReadyTutorialHubState(drillQuickTour, user)
const getErcoTutorialHubState = (user) => getReadyTutorialHubState(ercoQuickTour, user)
const getFitnessTestTutorialHubState = (user) =>
  getReadyTutorialHubState(fitnessTestQuickTour, user)
const getLeaveManagementTutorialHubState = (user) =>
  getReadyTutorialHubState(leaveManagementQuickTour, user)
const getMessagesTutorialHubState = (user) => getReadyTutorialHubState(messagesQuickTour, user)
const getMyLeaveTutorialHubState = (user) => getReadyTutorialHubState(myLeaveQuickTour, user)
const getMyOvertimeTutorialHubState = (user) => getReadyTutorialHubState(myOvertimeQuickTour, user)
const getOvertimeManagementTutorialHubState = (user) =>
  getReadyTutorialHubState(overtimeManagementQuickTour, user)
const getPayrollClaimsTutorialHubState = (user) =>
  getReadyTutorialHubState(payrollClaimsQuickTour, user)
const getRosterManagementTutorialHubState = (user) =>
  getReadyTutorialHubState(rosterManagementQuickTour, user)
const getSalaryClaimsManagementTutorialHubState = (user) =>
  getReadyTutorialHubState(salaryClaimsManagementQuickTour, user)
const getSettingsTutorialHubState = (user) => getReadyTutorialHubState(settingsQuickTour, user)
const getStaffDirectoryTutorialHubState = (user) =>
  getReadyTutorialHubState(staffDirectoryQuickTour, user)
const getTeamDirectoryTutorialHubState = (user) =>
  getReadyTutorialHubState(teamDirectoryQuickTour, user)
const getUsersTutorialHubState = (user) => getReadyTutorialHubState(usersQuickTour, user)

const isPayrollClaimsTutorialVisible = (user, options) =>
  hasPermission(user, 'self.payroll') &&
  ['payroll.self_service', 'payroll.claims', 'payroll.payslips'].every((key) =>
    isModuleEnabled(options?.moduleActivation, key),
  )

export const tutorialRegistry = [
  {
    moduleId: 'dashboard',
    label: 'Dashboard',
    description: 'Dashboard overview and quick status tutorial.',
    route: dashboardQuickTour.route,
    icon: 'dashboard',
    permission: 'self.dashboard',
    tourConfig: dashboardQuickTour,
    visible: (user, options) =>
      hasPermission(user, 'self.dashboard') &&
      isModuleEnabled(options?.moduleActivation, 'dashboard'),
    resolveHubState: getDashboardTutorialHubState,
  },
  {
    moduleId: 'messages',
    label: 'Messages',
    description: 'Inbox, conversations, and unread message tutorial.',
    route: messagesQuickTour.route,
    icon: 'messages',
    permission: 'self.messages',
    tourConfig: messagesQuickTour,
    visible: (user, options) =>
      hasPermission(user, 'self.messages') &&
      isModuleEnabled(options?.moduleActivation, 'messages'),
    resolveHubState: getMessagesTutorialHubState,
  },
  {
    moduleId: 'inspection',
    localized: true,
    label: {
      en: 'Inspection',
      bm: 'Pemeriksaan',
    },
    description: {
      en: 'Learn where records, filters, and new inspection actions are located.',
      bm: 'Ketahui lokasi rekod, penapis dan tindakan pemeriksaan baharu.',
    },
    route: inspectionQuickTour.route,
    icon: 'inspection',
    permission: 'reports.inspection.view',
    tourConfig: inspectionQuickTour,
    visible: (user) => hasPermission(user, 'reports.inspection.view'),
    resolveHubState: getInspectionTutorialHubState,
  },
  {
    moduleId: 'erco',
    label: 'ERCO',
    description: 'Emergency response reporting tutorial.',
    route: ercoQuickTour.route,
    icon: 'erco',
    permission: 'reports.erco.view',
    tourConfig: ercoQuickTour,
    visible: (user) => hasPermission(user, 'reports.erco.view'),
    resolveHubState: getErcoTutorialHubState,
  },
  {
    moduleId: 'drill',
    label: 'Drill',
    description: 'Drill record and review tutorial.',
    route: drillQuickTour.route,
    icon: 'drill',
    permission: 'reports.drill.view',
    tourConfig: drillQuickTour,
    visible: (user) => hasPermission(user, 'reports.drill.view'),
    resolveHubState: getDrillTutorialHubState,
  },
  {
    moduleId: 'fitness_test',
    label: 'Fitness Test',
    description: 'Fitness test record tutorial.',
    route: fitnessTestQuickTour.route,
    icon: 'fitness_test',
    permission: 'reports.fitness.view',
    tourConfig: fitnessTestQuickTour,
    visible: (user) => hasPermission(user, 'reports.fitness.view'),
    resolveHubState: getFitnessTestTutorialHubState,
  },
  {
    moduleId: 'my_leave',
    label: 'My Leave',
    description: 'Apply for leave and review your leave records.',
    route: myLeaveQuickTour.route,
    icon: 'leave',
    permission: 'self.leave',
    tourConfig: myLeaveQuickTour,
    visible: (user) => hasPermission(user, 'self.leave'),
    resolveHubState: getMyLeaveTutorialHubState,
  },
  {
    moduleId: 'my_overtime',
    label: 'My Overtime',
    description: 'Submit overtime and review your overtime records.',
    route: myOvertimeQuickTour.route,
    icon: 'overtime',
    permission: 'self.overtime',
    tourConfig: myOvertimeQuickTour,
    visible: (user, options) =>
      hasPermission(user, 'self.overtime') &&
      isModuleEnabled(options?.moduleActivation, 'overtime.self_service') &&
      options?.overtimeEligible !== false,
    resolveHubState: getMyOvertimeTutorialHubState,
  },
  {
    moduleId: 'payroll_claims',
    label: 'Payroll / Claims',
    description: 'Payslips, claims, and payroll self-service tutorial.',
    route: payrollClaimsQuickTour.route,
    icon: 'payroll',
    permission: 'self.payroll',
    tourConfig: payrollClaimsQuickTour,
    visible: isPayrollClaimsTutorialVisible,
    resolveHubState: getPayrollClaimsTutorialHubState,
  },
  {
    moduleId: 'staff_directory',
    label: 'Staff Directory',
    description: 'Find staff records and review staff details.',
    route: staffDirectoryQuickTour.route,
    icon: 'staff',
    permission: ['staff.view', 'staff.manage'],
    tourConfig: staffDirectoryQuickTour,
    visible: (user) => hasAnyPermission(user, ['staff.view', 'staff.manage']),
    resolveHubState: getStaffDirectoryTutorialHubState,
  },
  {
    moduleId: 'leave_management',
    label: 'Leave Management',
    description: 'Review leave records, holidays, and leave rules.',
    route: leaveManagementQuickTour.route,
    icon: 'leave_management',
    permission: 'staff.leave.manage',
    tourConfig: leaveManagementQuickTour,
    visible: (user) => hasPermission(user, 'staff.leave.manage'),
    resolveHubState: getLeaveManagementTutorialHubState,
  },
  {
    moduleId: 'overtime_management',
    label: 'Overtime Management',
    description: 'Review overtime records and overtime rules.',
    route: overtimeManagementQuickTour.route,
    icon: 'overtime_management',
    permission: 'staff.overtime.manage',
    tourConfig: overtimeManagementQuickTour,
    visible: (user) => hasPermission(user, 'staff.overtime.manage'),
    resolveHubState: getOvertimeManagementTutorialHubState,
  },
  {
    moduleId: 'salary_claims_management',
    label: 'Salary & Claims',
    description: 'Salary, claims, and payroll administration tutorial.',
    route: salaryClaimsManagementQuickTour.route,
    icon: 'salary_claims',
    permission: 'staff.salary.manage',
    tourConfig: salaryClaimsManagementQuickTour,
    visible: (user, options) =>
      hasPermission(user, 'staff.salary.manage') &&
      isModuleEnabled(options?.moduleActivation, 'payroll.salary_claims_management'),
    resolveHubState: getSalaryClaimsManagementTutorialHubState,
  },
  {
    moduleId: 'team_directory',
    label: 'Team Directory',
    description: 'Team details and team member information tutorial.',
    route: teamDirectoryQuickTour.route,
    icon: 'team',
    permission: 'teams.view',
    tourConfig: teamDirectoryQuickTour,
    visible: (user) => hasPermission(user, 'teams.view'),
    resolveHubState: getTeamDirectoryTutorialHubState,
  },
  {
    moduleId: 'roster_management',
    label: 'Roster Management',
    description: 'Roster overview, schedule, and shift planning tutorial.',
    route: rosterManagementQuickTour.route,
    icon: 'roster',
    permission: 'rosters.manage',
    tourConfig: rosterManagementQuickTour,
    visible: (user) => hasPermission(user, 'rosters.manage'),
    resolveHubState: getRosterManagementTutorialHubState,
  },
  {
    moduleId: 'users',
    label: 'Users',
    description: 'User account and access management tutorial.',
    route: '/admin/users',
    icon: 'users',
    permission: 'users.manage',
    visible: (user) => hasPermission(user, 'users.manage'),
    tourConfig: usersQuickTour,
    resolveHubState: getUsersTutorialHubState,
  },
  {
    moduleId: 'audit',
    label: 'Audit',
    description: 'Audit trail review and activity tracking tutorial.',
    route: auditQuickTour.route,
    icon: 'audit',
    permission: 'audit.view',
    tourConfig: auditQuickTour,
    visible: (user) => hasPermission(user, 'audit.view'),
    resolveHubState: getAuditTutorialHubState,
  },
  {
    moduleId: 'settings',
    label: 'Settings',
    description: 'System settings and configuration tutorial.',
    route: settingsQuickTour.route,
    icon: 'settings',
    permission: 'settings.manage',
    tourConfig: settingsQuickTour,
    visible: (user) => hasPermission(user, 'settings.manage'),
    resolveHubState: getSettingsTutorialHubState,
  },
]

tutorialRegistry.forEach((entry, index) => {
  assertValidTutorialRegistryEntry(entry, `tutorialRegistry[${index}]`)
})

const isTutorialVisible = (item, user, options) =>
  item.visible ? item.visible(user, options) : true
const resolveTutorialHubState = (item, user, options) =>
  item.resolveHubState?.(user, options) || {
    status: item.status || 'coming_soon',
    statusLabel: item.statusLabel || 'Coming soon',
    actionLabel: item.actionLabel || 'Coming soon',
    actionType: item.actionType || 'disabled',
  }

export const getVisibleTutorialHubItems = (user, options = {}) =>
  tutorialRegistry
    .filter((item) => isTutorialVisible(item, user, options))
    .map((item) => ({
      ...item,
      ...resolveTutorialHubState(item, user, options),
      localized: item.localized || item.tourConfig?.localized || false,
      replayEvent: item.tourConfig?.replayEvent || item.replayEvent || null,
      source: item.tourConfig?.sourceDefaults?.tutorialHub || TUTORIAL_HUB_SOURCE,
    }))
    .filter((item, index) =>
      validateOnboardingContract(
        assertValidTutorialHubItem,
        item,
        `visibleTutorialHubItems[${index}]`,
      ),
    )
    .filter((item) => item.status !== 'hidden')

export const getReadyTourConfigs = (user, options = {}) =>
  tutorialRegistry
    .filter((item) => item.tourConfig && isTutorialVisible(item, user, options))
    .filter((item) => resolveTutorialHubState(item, user, options).status === 'ready')
    .map((item) => item.tourConfig)
    .filter((config, index) =>
      validateOnboardingContract(assertValidTourConfig, config, `readyTourConfigs[${index}]`),
    )
