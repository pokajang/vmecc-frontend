export const DASHBOARD_SECTION_PERMISSIONS = {
  payroll: 'dashboard.payroll.view',
  overtime: 'dashboard.overtime.view',
  leave: 'dashboard.leave.view',
  roster: 'dashboard.roster.view',
  reports: 'dashboard.reports.view',
}

export const DASHBOARD_VISIBILITY_ROWS = [
  {
    key: 'payroll',
    permission: DASHBOARD_SECTION_PERMISSIONS.payroll,
    title: 'Payroll Claims',
    description: 'Salary and expense claim summary cards and charts.',
  },
  {
    key: 'overtime',
    permission: DASHBOARD_SECTION_PERMISSIONS.overtime,
    title: 'Overtime',
    description: 'Overtime request overview, activity, and status breakdown.',
  },
  {
    key: 'leave',
    permission: DASHBOARD_SECTION_PERMISSIONS.leave,
    title: 'Leave',
    description: 'Leave request overview and team breakdown widgets.',
  },
  {
    key: 'roster',
    permission: DASHBOARD_SECTION_PERMISSIONS.roster,
    title: 'Roster & Teams',
    description: 'Roster snapshot, activity, and team coverage widgets.',
  },
  {
    key: 'reports',
    permission: DASHBOARD_SECTION_PERMISSIONS.reports,
    title: 'Reports',
    description: 'ERCO, Drill, and Fitness Test dashboard summary section.',
  },
]
