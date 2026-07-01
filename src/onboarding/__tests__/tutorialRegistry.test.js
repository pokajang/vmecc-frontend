import { describe, expect, it } from 'vitest'

import {
  getReadyTourConfigs,
  getVisibleTutorialHubItems,
  TUTORIAL_HUB_SOURCE,
} from '../tutorialRegistry'
import { auditQuickTour } from '../auditQuickTourConfig'
import { dashboardQuickTour } from '../dashboardQuickTourConfig'
import { drillQuickTour } from '../drillQuickTourConfig'
import { ercoQuickTour } from '../ercoQuickTourConfig'
import { fitnessTestQuickTour } from '../fitnessTestQuickTourConfig'
import { inspectionQuickTour } from '../inspectionQuickTourConfig'
import { leaveManagementQuickTour } from '../leaveManagementQuickTourConfig'
import { messagesQuickTour } from '../messagesQuickTourConfig'
import { myLeaveQuickTour } from '../myLeaveQuickTourConfig'
import { myOvertimeQuickTour } from '../myOvertimeQuickTourConfig'
import { overtimeManagementQuickTour } from '../overtimeManagementQuickTourConfig'
import { payrollClaimsQuickTour } from '../payrollClaimsQuickTourConfig'
import { rosterManagementQuickTour } from '../rosterManagementQuickTourConfig'
import { salaryClaimsManagementQuickTour } from '../salaryClaimsManagementQuickTourConfig'
import { settingsQuickTour } from '../settingsQuickTourConfig'
import { staffDirectoryQuickTour } from '../staffDirectoryQuickTourConfig'
import { teamDirectoryQuickTour } from '../teamDirectoryQuickTourConfig'
import { usersQuickTour } from '../usersQuickTourConfig'

const completeTrtUser = {
  id: 12,
  name: 'TRT User',
  roles: ['Tactical Response Team'],
  permissions: [
    'reports.inspection.view',
    'reports.erco.view',
    'reports.drill.view',
    'reports.fitness.view',
  ],
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

describe('tutorialRegistry', () => {
  it('returns a ready Inspection tutorial for a complete eligible TRT user', () => {
    const items = getVisibleTutorialHubItems(completeTrtUser)

    expect(items.find((item) => item.moduleId === 'inspection')).toMatchObject({
      localized: true,
      status: 'ready',
      actionLabel: { en: 'Start', bm: 'Mula' },
      actionType: 'start',
      label: { en: 'Inspection', bm: 'Pemeriksaan' },
      source: TUTORIAL_HUB_SOURCE,
    })
    expect(getReadyTourConfigs(completeTrtUser)).toEqual(
      expect.arrayContaining([
        inspectionQuickTour,
        ercoQuickTour,
        drillQuickTour,
        fitnessTestQuickTour,
      ]),
    )
  })

  it('keeps Inspection ready for manual launch when the TRT profile is incomplete', () => {
    const items = getVisibleTutorialHubItems({ ...completeTrtUser, phone: '' })

    expect(items.find((item) => item.moduleId === 'inspection')).toMatchObject({
      status: 'ready',
      actionLabel: { en: 'Start', bm: 'Mula' },
      actionType: 'start',
    })
    expect(getReadyTourConfigs({ ...completeTrtUser, phone: '' })).toEqual(
      expect.arrayContaining([
        inspectionQuickTour,
        ercoQuickTour,
        drillQuickTour,
        fitnessTestQuickTour,
      ]),
    )
  })

  it('marks Dashboard as ready when the user has dashboard access', () => {
    const dashboardUser = {
      id: 14,
      name: 'Dashboard User',
      roles: ['Representative'],
      permissions: ['self.dashboard'],
    }

    expect(
      getVisibleTutorialHubItems(dashboardUser).find((item) => item.moduleId === 'dashboard'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(dashboardUser)).toEqual([dashboardQuickTour])
  })

  it('marks ERCO as ready when the user can view ERCO reports', () => {
    const items = getVisibleTutorialHubItems({
      ...completeTrtUser,
      permissions: ['reports.inspection.view', 'reports.erco.view'],
    })

    expect(items.map((item) => item.moduleId)).toEqual(['inspection', 'erco'])
    expect(items.find((item) => item.moduleId === 'erco')).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs({ ...completeTrtUser, permissions: ['reports.erco.view'] })).toEqual(
      [ercoQuickTour],
    )
  })

  it('allows a permitted non-TRT user to manually launch Inspection', () => {
    const adminUser = {
      ...completeTrtUser,
      roles: ['Admin'],
      permissions: ['reports.inspection.view'],
      phone: '',
    }

    expect(
      getVisibleTutorialHubItems(adminUser).find((item) => item.moduleId === 'inspection'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: { en: 'Start', bm: 'Mula' },
      actionType: 'start',
    })
    expect(getReadyTourConfigs(adminUser)).toEqual([inspectionQuickTour])
  })

  it('marks My Leave as ready when the user has self-service leave access', () => {
    const leaveUser = {
      id: 16,
      name: 'Leave User',
      roles: ['Staff'],
      permissions: ['self.leave'],
    }

    expect(
      getVisibleTutorialHubItems(leaveUser).find((item) => item.moduleId === 'my_leave'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(leaveUser)).toEqual([myLeaveQuickTour])
  })

  it('marks My Overtime as ready only when the module is enabled and the user is eligible', () => {
    const overtimeUser = {
      id: 18,
      name: 'Overtime User',
      roles: ['Tactical Response Team'],
      permissions: ['self.overtime'],
    }
    const enabledOptions = {
      moduleActivation: {
        effective: {
          'overtime.self_service': {
            enabled: true,
          },
        },
      },
      overtimeEligible: true,
    }

    expect(
      getVisibleTutorialHubItems(overtimeUser, enabledOptions).find(
        (item) => item.moduleId === 'my_overtime',
      ),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(overtimeUser, enabledOptions)).toEqual([myOvertimeQuickTour])
  })

  it('hides My Overtime when the user is ineligible or the module is disabled', () => {
    const overtimeUser = {
      id: 18,
      name: 'Overtime User',
      roles: ['Representative'],
      permissions: ['self.overtime'],
    }

    expect(
      getVisibleTutorialHubItems(overtimeUser, {
        moduleActivation: {
          effective: {
            'overtime.self_service': {
              enabled: true,
            },
          },
        },
        overtimeEligible: false,
      }).find((item) => item.moduleId === 'my_overtime'),
    ).toBeUndefined()

    expect(
      getVisibleTutorialHubItems(overtimeUser, {
        moduleActivation: {
          effective: {
            'overtime.self_service': {
              enabled: false,
            },
          },
        },
        overtimeEligible: true,
      }).find((item) => item.moduleId === 'my_overtime'),
    ).toBeUndefined()
  })

  it('marks Payroll / Claims as ready only when all payroll self-service modules are enabled', () => {
    const payrollUser = {
      id: 24,
      name: 'Payroll User',
      roles: ['Staff'],
      permissions: ['self.payroll'],
    }
    const enabledOptions = {
      moduleActivation: {
        effective: {
          'payroll.self_service': {
            enabled: true,
          },
          'payroll.claims': {
            enabled: true,
          },
          'payroll.payslips': {
            enabled: true,
          },
        },
      },
    }

    expect(
      getVisibleTutorialHubItems(payrollUser, enabledOptions).find(
        (item) => item.moduleId === 'payroll_claims',
      ),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(payrollUser, enabledOptions)).toEqual([payrollClaimsQuickTour])
  })

  it('marks Staff Directory as ready when the user can view staff records', () => {
    const staffUser = {
      id: 28,
      name: 'Staff Admin',
      roles: ['Admin'],
      permissions: ['staff.view'],
    }

    expect(
      getVisibleTutorialHubItems(staffUser).find((item) => item.moduleId === 'staff_directory'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(staffUser)).toEqual([staffDirectoryQuickTour])
  })

  it('marks Staff Directory as ready when the user can manage staff records', () => {
    const staffManager = {
      id: 29,
      name: 'Staff Manager',
      roles: ['Admin'],
      permissions: ['staff.manage'],
    }

    expect(
      getVisibleTutorialHubItems(staffManager).find((item) => item.moduleId === 'staff_directory'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs(staffManager)).toEqual([staffDirectoryQuickTour])
  })

  it('marks Leave Management as ready when the user can manage leave', () => {
    const leaveManager = {
      id: 30,
      name: 'Leave Manager',
      roles: ['Admin'],
      permissions: ['staff.leave.manage'],
    }

    expect(
      getVisibleTutorialHubItems(leaveManager).find((item) => item.moduleId === 'leave_management'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(leaveManager)).toEqual([leaveManagementQuickTour])
  })

  it('hides Leave Management when the user lacks staff.leave.manage', () => {
    const leaveManager = {
      id: 30,
      name: 'Leave Manager',
      roles: ['Admin'],
      permissions: [],
    }

    expect(
      getVisibleTutorialHubItems(leaveManager).find((item) => item.moduleId === 'leave_management'),
    ).toBeUndefined()
    expect(getReadyTourConfigs(leaveManager)).toEqual([])
  })

  it('marks Overtime Management as ready when the user can manage overtime', () => {
    const overtimeManager = {
      id: 34,
      name: 'Overtime Manager',
      roles: ['Admin'],
      permissions: ['staff.overtime.manage'],
    }

    expect(
      getVisibleTutorialHubItems(overtimeManager).find(
        (item) => item.moduleId === 'overtime_management',
      ),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(overtimeManager)).toEqual([overtimeManagementQuickTour])
  })

  it('hides Overtime Management when the user lacks staff.overtime.manage', () => {
    const overtimeManager = {
      id: 34,
      name: 'Overtime Manager',
      roles: ['Admin'],
      permissions: [],
    }

    expect(
      getVisibleTutorialHubItems(overtimeManager).find(
        (item) => item.moduleId === 'overtime_management',
      ),
    ).toBeUndefined()
    expect(getReadyTourConfigs(overtimeManager)).toEqual([])
  })

  it('marks Team Directory as ready when the user can view teams', () => {
    const teamUser = {
      id: 31,
      name: 'Team Viewer',
      roles: ['Admin'],
      permissions: ['teams.view'],
    }

    expect(
      getVisibleTutorialHubItems(teamUser).find((item) => item.moduleId === 'team_directory'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(teamUser)).toEqual([teamDirectoryQuickTour])
  })

  it('hides Team Directory when the user lacks teams.view even if teams.manage is present', () => {
    const teamManager = {
      id: 32,
      name: 'Team Manager',
      roles: ['Admin'],
      permissions: ['teams.manage'],
    }

    expect(
      getVisibleTutorialHubItems(teamManager).find((item) => item.moduleId === 'team_directory'),
    ).toBeUndefined()
    expect(getReadyTourConfigs(teamManager)).toEqual([])
  })

  it('marks Roster Management as ready when the user can manage rosters', () => {
    const rosterUser = {
      id: 33,
      name: 'Roster Manager',
      roles: ['Admin'],
      permissions: ['rosters.manage'],
    }

    expect(
      getVisibleTutorialHubItems(rosterUser).find((item) => item.moduleId === 'roster_management'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(rosterUser)).toEqual([rosterManagementQuickTour])
  })

  it('hides Payroll / Claims when payroll self-service is disabled', () => {
    const payrollUser = {
      id: 24,
      name: 'Payroll User',
      roles: ['Staff'],
      permissions: ['self.payroll'],
    }

    expect(
      getVisibleTutorialHubItems(payrollUser, {
        moduleActivation: {
          effective: {
            'payroll.self_service': {
              enabled: false,
            },
            'payroll.claims': {
              enabled: true,
            },
            'payroll.payslips': {
              enabled: true,
            },
          },
        },
      }).find((item) => item.moduleId === 'payroll_claims'),
    ).toBeUndefined()
  })

  it('hides Payroll / Claims when the claims route family is disabled', () => {
    const payrollUser = {
      id: 24,
      name: 'Payroll User',
      roles: ['Staff'],
      permissions: ['self.payroll'],
    }

    expect(
      getVisibleTutorialHubItems(payrollUser, {
        moduleActivation: {
          effective: {
            'payroll.self_service': {
              enabled: true,
            },
            'payroll.claims': {
              enabled: false,
            },
            'payroll.payslips': {
              enabled: true,
            },
          },
        },
      }).find((item) => item.moduleId === 'payroll_claims'),
    ).toBeUndefined()
  })

  it('marks Salary & Claims as ready only when staff.salary.manage and payroll.salary_claims_management are enabled', () => {
    const salaryManager = {
      id: 35,
      name: 'Salary Manager',
      roles: ['Admin'],
      permissions: ['staff.salary.manage'],
    }
    const options = {
      moduleActivation: {
        effective: {
          'payroll.salary_claims_management': {
            enabled: true,
          },
        },
      },
    }

    expect(
      getVisibleTutorialHubItems(salaryManager, options).find(
        (item) => item.moduleId === 'salary_claims_management',
      ),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(salaryManager, options)).toEqual([salaryClaimsManagementQuickTour])
  })

  it('hides Salary & Claims when payroll.salary_claims_management is off', () => {
    const salaryManager = {
      id: 35,
      name: 'Salary Manager',
      roles: ['Admin'],
      permissions: ['staff.salary.manage'],
    }

    expect(
      getVisibleTutorialHubItems(salaryManager, {
        moduleActivation: {
          effective: {
            'payroll.salary_claims_management': {
              enabled: false,
            },
          },
        },
      }).find((item) => item.moduleId === 'salary_claims_management'),
    ).toBeUndefined()
    expect(
      getReadyTourConfigs(salaryManager, {
        moduleActivation: {
          effective: {
            'payroll.salary_claims_management': {
              enabled: false,
            },
          },
        },
      }),
    ).toEqual([])
  })

  it('does not make Salary & Claims ready from adjacent salary settings modules alone', () => {
    const salaryManager = {
      id: 35,
      name: 'Salary Manager',
      roles: ['Admin'],
      permissions: ['staff.salary.manage'],
    }

    expect(
      getVisibleTutorialHubItems(salaryManager, {
        moduleActivation: {
          effective: {
            'payroll.salary_claims_management': {
              enabled: false,
            },
            'payroll.salary_settings': {
              enabled: true,
            },
            'payroll.workflow_rules': {
              enabled: true,
            },
            'payroll.company_profile': {
              enabled: true,
            },
            'payroll.salary_assignments': {
              enabled: true,
            },
          },
        },
      }).find((item) => item.moduleId === 'salary_claims_management'),
    ).toBeUndefined()
    expect(
      getReadyTourConfigs(salaryManager, {
        moduleActivation: {
          effective: {
            'payroll.salary_claims_management': {
              enabled: false,
            },
            'payroll.salary_settings': {
              enabled: true,
            },
          },
        },
      }),
    ).toEqual([])
  })

  it('marks Users as ready only when users.manage is present', () => {
    const usersAdmin = {
      id: 40,
      name: 'Users Admin',
      permissions: ['users.manage'],
    }

    expect(
      getVisibleTutorialHubItems(usersAdmin).find((item) => item.moduleId === 'users'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(usersAdmin)).toEqual([usersQuickTour])
  })

  it('hides Users when users.manage is missing', () => {
    const normalUser = {
      id: 41,
      name: 'Normal User',
      permissions: [],
    }

    expect(
      getVisibleTutorialHubItems(normalUser).find((item) => item.moduleId === 'users'),
    ).toBeUndefined()
    expect(getReadyTourConfigs(normalUser)).toEqual([])
  })

  it('marks Audit as ready only when audit.view is present', () => {
    const auditAdmin = {
      id: 42,
      name: 'Audit Admin',
      permissions: ['audit.view'],
    }

    expect(
      getVisibleTutorialHubItems(auditAdmin).find((item) => item.moduleId === 'audit'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
      localized: false,
    })
    expect(getReadyTourConfigs(auditAdmin)).toEqual([auditQuickTour])
  })

  it('hides Audit when audit.view is missing', () => {
    const normalUser = {
      id: 43,
      name: 'Normal User',
      permissions: [],
    }

    expect(
      getVisibleTutorialHubItems(normalUser).find((item) => item.moduleId === 'audit'),
    ).toBeUndefined()
    expect(getReadyTourConfigs(normalUser)).toEqual([])
  })

  it('hides Payroll / Claims when the payslips route family is disabled', () => {
    const payrollUser = {
      id: 24,
      name: 'Payroll User',
      roles: ['Staff'],
      permissions: ['self.payroll'],
    }

    expect(
      getVisibleTutorialHubItems(payrollUser, {
        moduleActivation: {
          effective: {
            'payroll.self_service': {
              enabled: true,
            },
            'payroll.claims': {
              enabled: true,
            },
            'payroll.payslips': {
              enabled: false,
            },
          },
        },
      }).find((item) => item.moduleId === 'payroll_claims'),
    ).toBeUndefined()
  })

  it('shows system administrators all visible tutorials, including ready dashboard', () => {
    const items = getVisibleTutorialHubItems({
      id: 1,
      name: 'System Admin',
      roles: ['System Administrator'],
      permissions: [],
    })

    expect(items.map((item) => item.moduleId)).toEqual(
      expect.arrayContaining([
        'dashboard',
        'messages',
        'inspection',
        'erco',
        'drill',
        'fitness_test',
        'users',
        'audit',
        'settings',
      ]),
    )
    expect(items.find((item) => item.moduleId === 'inspection')).toMatchObject({
      status: 'ready',
      actionType: 'start',
    })
    expect(items.find((item) => item.moduleId === 'dashboard')).toMatchObject({
      status: 'ready',
      actionType: 'start',
    })
    expect(items.find((item) => item.moduleId === 'audit')).toMatchObject({
      status: 'ready',
      actionType: 'start',
    })
  })

  it('limits client-facing users to their accessible tutorials', () => {
    const items = getVisibleTutorialHubItems({
      id: 20,
      name: 'Client Rep',
      roles: ['Representative'],
      permissions: ['self.dashboard', 'self.messages', 'teams.view'],
    })

    expect(items.map((item) => item.moduleId)).toEqual(['dashboard', 'messages', 'team_directory'])
  })

  it('marks Drill as ready when the user can view Drill reports', () => {
    const drillUser = {
      id: 44,
      name: 'Drill User',
      permissions: ['reports.drill.view'],
    }

    expect(
      getVisibleTutorialHubItems(drillUser).find((item) => item.moduleId === 'drill'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs(drillUser)).toEqual([drillQuickTour])
  })

  it('marks Fitness Test as ready when the user can view fitness reports', () => {
    const fitnessUser = {
      id: 45,
      name: 'Fitness User',
      permissions: ['reports.fitness.view'],
    }

    expect(
      getVisibleTutorialHubItems(fitnessUser).find((item) => item.moduleId === 'fitness_test'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs(fitnessUser)).toEqual([fitnessTestQuickTour])
  })

  it('marks Messages as ready when the user can access messages', () => {
    const messagesUser = {
      id: 46,
      name: 'Messages User',
      permissions: ['self.messages'],
    }

    expect(
      getVisibleTutorialHubItems(messagesUser).find((item) => item.moduleId === 'messages'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs(messagesUser)).toEqual([messagesQuickTour])
  })

  it('marks Settings as ready when the user can manage settings', () => {
    const settingsAdmin = {
      id: 47,
      name: 'Settings Admin',
      permissions: ['settings.manage'],
    }

    expect(
      getVisibleTutorialHubItems(settingsAdmin).find((item) => item.moduleId === 'settings'),
    ).toMatchObject({
      status: 'ready',
      actionLabel: 'Start',
      actionType: 'start',
    })
    expect(getReadyTourConfigs(settingsAdmin)).toEqual([settingsQuickTour])
  })
})
