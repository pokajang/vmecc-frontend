export const PERMISSION_GROUPS = [
  {
    label: 'System Admin',
    permissions: ['users.manage', 'roles.assign', 'audit.view', 'settings.manage'],
  },
  {
    label: 'Organisation',
    permissions: [
      'staff.view',
      'staff.manage',
      'staff.leave.manage',
      'staff.salary.manage',
      'staff.salary.pay',
      'staff.overtime.manage',
      'reports.manage',
      'teams.view',
      'teams.manage',
      'rosters.manage',
    ],
  },
  {
    label: 'Route Access',
    permissions: [
      'reports.inspection.view',
      'reports.erco.view',
      'reports.drill.view',
      'reports.fitness.view',
    ],
  },
  {
    label: 'Dashboard',
    permissions: [
      'dashboard.payroll.view',
      'dashboard.overtime.view',
      'dashboard.leave.view',
      'dashboard.roster.view',
      'dashboard.reports.view',
    ],
  },
  {
    label: 'Self Service',
    permissions: ['self.dashboard', 'self.messages', 'self.leave', 'self.overtime', 'self.payroll'],
  },
  {
    label: 'Profile',
    permissions: ['self.profile.banking', 'self.profile.medical', 'self.profile.emergency'],
  },
]

export const PERMISSION_LABELS = {
  'users.manage': 'User Management',
  'roles.assign': 'Role Assignment',
  'audit.view': 'Audit Logs',
  'settings.manage': 'System Settings',
  'staff.view': 'View Staff',
  'staff.manage': 'Manage Staff',
  'staff.leave.manage': 'Leave Management',
  'staff.salary.manage': 'Salary & Claims',
  'staff.salary.pay': 'Salary Payment Actions',
  'staff.overtime.manage': 'Overtime Management',
  'reports.manage': 'Reports Management',
  'reports.inspection.view': 'Inspection Page',
  'reports.erco.view': 'ERCO Report Page',
  'reports.drill.view': 'Drill Report Page',
  'reports.fitness.view': 'Fitness Test Report Page',
  'dashboard.payroll.view': 'Dashboard Payroll Section',
  'dashboard.overtime.view': 'Dashboard Overtime Section',
  'dashboard.leave.view': 'Dashboard Leave Section',
  'dashboard.roster.view': 'Dashboard Roster Section',
  'dashboard.reports.view': 'Dashboard Reports Section',
  'teams.view': 'View Teams',
  'teams.manage': 'Manage Teams',
  'rosters.manage': 'Roster Management',
  'self.dashboard': 'Dashboard',
  'self.messages': 'Messages',
  'self.leave': 'Leave',
  'self.overtime': 'Overtime',
  'self.payroll': 'Payroll',
  'self.profile.banking': 'Banking Info',
  'self.profile.medical': 'Medical Info',
  'self.profile.emergency': 'Emergency Contact',
}

export const PERM_TO_GROUP = PERMISSION_GROUPS.reduce((acc, group) => {
  group.permissions.forEach((perm) => {
    acc[perm] = group.label
  })
  return acc
}, {})

export const LOCKED_ROLE = 'System Administrator'
export const VIEW_MODE_MATRIX = 'matrix'
export const VIEW_MODE_ROLE = 'role-focused'
export const VIEW_MODE_STORAGE_KEY = 'settings.rolePermission.viewMode'
