import React from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Typography = React.lazy(() => import('./views/theme/typography/Typography'))

// Base
const Accordion = React.lazy(() => import('./views/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('./views/base/breadcrumbs/Breadcrumbs'))
const Carousels = React.lazy(() => import('./views/base/carousels/Carousels'))
const Collapses = React.lazy(() => import('./views/base/collapses/Collapses'))
const ListGroups = React.lazy(() => import('./views/base/list-groups/ListGroups'))
const Navs = React.lazy(() => import('./views/base/navs/Navs'))
const Paginations = React.lazy(() => import('./views/base/paginations/Paginations'))
const Placeholders = React.lazy(() => import('./views/base/placeholders/Placeholders'))
const Popovers = React.lazy(() => import('./views/base/popovers/Popovers'))
const Progress = React.lazy(() => import('./views/base/progress/Progress'))
const Spinners = React.lazy(() => import('./views/base/spinners/Spinners'))
const Tabs = React.lazy(() => import('./views/base/tabs/Tabs'))
const Tooltips = React.lazy(() => import('./views/base/tooltips/Tooltips'))

// Buttons
const Buttons = React.lazy(() => import('./views/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('./views/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('./views/buttons/dropdowns/Dropdowns'))

//Forms
const ChecksRadios = React.lazy(() => import('./views/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('./views/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('./views/forms/form-control/FormControl'))
const Layout = React.lazy(() => import('./views/forms/layout/Layout'))
const Range = React.lazy(() => import('./views/forms/range/Range'))
const Select = React.lazy(() => import('./views/forms/select/Select'))
const Validation = React.lazy(() => import('./views/forms/validation/Validation'))

const Charts = React.lazy(() => import('./views/charts/Charts'))

// Icons
const CoreUIIcons = React.lazy(() => import('./views/icons/coreui-icons/CoreUIIcons'))
const Flags = React.lazy(() => import('./views/icons/flags/Flags'))
const Brands = React.lazy(() => import('./views/icons/brands/Brands'))

// Notifications
const Alerts = React.lazy(() => import('./views/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('./views/notifications/badges/Badges'))
const Toasts = React.lazy(() => import('./views/notifications/toasts/Toasts'))

const UserManagement = React.lazy(() => import('./views/users/UserManagement'))
const UserProfile = React.lazy(() => import('./views/users/UserProfile'))
const AuditLogs = React.lazy(() => import('./views/audit/AuditLogs'))
const Profile = React.lazy(() => import('./views/profile/Profile'))
const Payroll = React.lazy(() => import('./views/payroll/Payroll'))
const Leave = React.lazy(() => import('./views/leave/Leave'))
const Overtime = React.lazy(() => import('./views/overtime/Overtime'))
const Reports = React.lazy(() => import('./views/report/Reports'))
const Inspection = React.lazy(() => import('./views/inspection/InspectionPage'))
const StaffDetails = React.lazy(() => import('./views/staff/StaffDetails'))
const LeaveManagement = React.lazy(() => import('./views/staff/LeaveManagement'))
const OvertimeManagement = React.lazy(() => import('./views/staff/OvertimeManagement'))
const SalaryClaimsManagement = React.lazy(() => import('./views/staff/SalaryClaimsManagement'))
const ShiftSettings = React.lazy(() => import('./views/staff/ShiftSettings'))
const StaffProfile = React.lazy(() => import('./views/staff/StaffProfile'))
const RosterManagement = React.lazy(() => import('./views/roster/RosterManagement'))
const TeamDetails = React.lazy(() => import('./views/team/TeamDetails'))
const TeamView = React.lazy(() => import('./views/team/TeamView'))
const Settings = React.lazy(() => import('./views/settings/Settings'))
const Messages = React.lazy(() => import('./views/messages/Messages'))

const SALARY_CLAIMS_TAB_PATH_MAP = {
  claims: 'claims',
  salary: 'salary',
  'set-salary': 'set-salary',
  'set-ot-rate': 'set-ot-rate',
  'workflow-rules': 'workflow-rules',
  'company-legal': 'company-legal',
  claimRecords: 'claims',
  salaryRecords: 'salary',
  assignment: 'set-salary',
  otRates: 'set-ot-rate',
  workflowRules: 'workflow-rules',
  companyLegal: 'company-legal',
}

const LEAVE_MANAGEMENT_TAB_PATH_MAP = {
  leaves: 'leaves',
  'set-leaves': 'set-leaves',
  'set-holidays': 'set-holidays',
  overtime: 'overtime',
  rules: 'rules',
  records: 'leaves',
  assignments: 'set-leaves',
  holidays: 'set-holidays',
}

const OVERTIME_MANAGEMENT_TAB_PATH_MAP = {
  records: 'records',
  rules: 'rules',
  overtimeRecords: 'records',
  otRules: 'rules',
}

const resolveMappedTabPath = (map, value, fallback) => {
  const raw = String(value || '').trim()
  return map[raw] || fallback
}

const LegacySalaryAssignmentEditRedirect = () => {
  const { assignmentId } = useParams()
  return <Navigate to={`/staff/set-salary/assignment/${assignmentId}/edit`} replace />
}

const LegacySalaryAssignmentViewRedirect = () => {
  const { assignmentId } = useParams()
  return <Navigate to={`/staff/set-salary/assignment/${assignmentId}/view`} replace />
}

const StaffSalaryClaimsRedirect = () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const mappedPath = resolveMappedTabPath(
    SALARY_CLAIMS_TAB_PATH_MAP,
    params.get('tab') || location.state?.tab,
    'salary',
  )
  return <Navigate to={`/staff/salary-claims/${mappedPath}`} replace />
}

const StaffLeaveManagementRedirect = () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const mappedPath = resolveMappedTabPath(
    LEAVE_MANAGEMENT_TAB_PATH_MAP,
    params.get('tab') || location.state?.tab,
    'leaves',
  )
  return <Navigate to={`/staff/leave-management/${mappedPath}`} replace />
}

const StaffOvertimeManagementRedirect = () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const mappedPath = resolveMappedTabPath(
    OVERTIME_MANAGEMENT_TAB_PATH_MAP,
    params.get('tab') || location.state?.tab,
    'records',
  )
  return <Navigate to={`/staff/overtime-management/${mappedPath}`} replace />
}

const LegacyLeaveManagementDetailRedirect = () => {
  const { leaveId } = useParams()
  const routeValue = String(leaveId || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  const encodedLeaveId = encodeURIComponent(decodedValue)
  return <Navigate to={`/staff/leave-management/record/${encodedLeaveId}`} replace />
}

const LegacyLeaveManagementRedirect = () => <Navigate to="/staff/leave-management/leaves" replace />
const LegacySalaryClaimsOvertimeRedirect = () => {
  const { overtimeRouteKey } = useParams()
  const routeValue = String(overtimeRouteKey || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  const encodedOvertimeKey = encodeURIComponent(decodedValue)
  return <Navigate to={`/staff/overtime-management/record/${encodedOvertimeKey}`} replace />
}

const LegacyStaffLeaveManagementRouteRedirect = () => {
  const { legacyLeaveId } = useParams()
  const routeValue = String(legacyLeaveId || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  if (['leaves', 'set-leaves', 'set-holidays', 'overtime', 'rules'].includes(decodedValue)) {
    return <Navigate to={`/staff/leave-management/${decodedValue}`} replace />
  }
  return (
    <Navigate to={`/staff/leave-management/record/${encodeURIComponent(decodedValue)}`} replace />
  )
}

const LegacyStaffOvertimeManagementRouteRedirect = () => {
  const { legacyOvertimeRouteKey } = useParams()
  const routeValue = String(legacyOvertimeRouteKey || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  if (['records', 'rules'].includes(decodedValue)) {
    return <Navigate to={`/staff/overtime-management/${decodedValue}`} replace />
  }
  return (
    <Navigate
      to={`/staff/overtime-management/record/${encodeURIComponent(decodedValue)}`}
      replace
    />
  )
}

const LegacyStaffSalaryClaimsRouteRedirect = () => {
  const { legacyClaimId } = useParams()
  const routeValue = String(legacyClaimId || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  if (
    ['claims', 'salary', 'set-salary', 'set-ot-rate', 'workflow-rules', 'company-legal'].includes(
      decodedValue,
    )
  ) {
    return <Navigate to={`/staff/salary-claims/${decodedValue}`} replace />
  }
  if (decodedValue === 'workflowRules') {
    return <Navigate to="/staff/salary-claims/workflow-rules" replace />
  }
  if (decodedValue === 'assignment') {
    return <Navigate to="/staff/salary-claims/set-salary" replace />
  }
  if (decodedValue === 'companyLegal') {
    return <Navigate to="/staff/salary-claims/company-legal" replace />
  }
  return <Navigate to={`/staff/salary-claims/claim/${encodeURIComponent(decodedValue)}`} replace />
}

const LegacyWorkflowNotificationsAliasRedirect = () => <Navigate to="/" replace />

const ReportInspectionNewSectionRedirect = () => {
  const { newSection } = useParams()
  return <Navigate to={`/inspection/new/${encodeURIComponent(String(newSection || ''))}`} replace />
}

const ReportInspectionDetailRedirect = () => {
  const { reportId } = useParams()
  const routeValue = String(reportId || '')
  let decodedValue = routeValue
  try {
    decodedValue = decodeURIComponent(routeValue)
  } catch {
    decodedValue = routeValue
  }
  return <Navigate to={`/inspection/${encodeURIComponent(decodedValue)}`} replace />
}

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/theme', name: 'Theme', element: Colors, exact: true },
  { path: '/theme/colors', name: 'Colors', element: Colors },
  { path: '/theme/typography', name: 'Typography', element: Typography },
  { path: '/base', name: 'Base', element: Accordion, exact: true },
  { path: '/base/accordion', name: 'Accordion', element: Accordion },
  { path: '/base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  { path: '/base/carousels', name: 'Carousel', element: Carousels },
  { path: '/base/collapses', name: 'Collapse', element: Collapses },
  { path: '/base/list-groups', name: 'List Groups', element: ListGroups },
  { path: '/base/navs', name: 'Navs', element: Navs },
  { path: '/base/paginations', name: 'Paginations', element: Paginations },
  { path: '/base/placeholders', name: 'Placeholders', element: Placeholders },
  { path: '/base/popovers', name: 'Popovers', element: Popovers },
  { path: '/base/progress', name: 'Progress', element: Progress },
  { path: '/base/spinners', name: 'Spinners', element: Spinners },
  { path: '/base/tabs', name: 'Tabs', element: Tabs },
  { path: '/base/tooltips', name: 'Tooltips', element: Tooltips },
  { path: '/admin/users', name: 'Users', element: UserManagement },
  { path: '/admin/users/:id/:slug', name: 'User Profile', element: UserProfile },
  { path: '/admin/users/:id', name: 'User Profile', element: UserProfile },
  { path: '/admin/audit', name: 'Audit', element: AuditLogs },
  { path: '/buttons', name: 'Buttons', element: Buttons, exact: true },
  { path: '/buttons/buttons', name: 'Buttons', element: Buttons },
  { path: '/buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
  { path: '/buttons/button-groups', name: 'Button Groups', element: ButtonGroups },
  { path: '/charts', name: 'Charts', element: Charts },
  { path: '/profile', name: 'Profile', element: Profile },
  { path: '/profile/security', name: 'Security', element: Profile },
  { path: '/payroll', name: 'Payroll', element: Payroll },
  { path: '/payroll/claims', name: 'Claims', element: Payroll },
  { path: '/payroll/claims/new', name: 'New Claim', element: Payroll },
  { path: '/payroll/claims/new/expense', name: 'Expense Claim', element: Payroll },
  { path: '/payroll/claims/new/salary', name: 'Salary Claim', element: Payroll },
  { path: '/payroll/claims/:claimId', name: 'Claim Detail', element: Payroll },
  { path: '/payroll/payslips', name: 'Payslips', element: Payroll },
  { path: '/leave', name: 'Leave', element: Leave },
  { path: '/leave/new', name: 'Apply Leave', element: Leave },
  { path: '/leave/:leaveId', name: 'Leave Detail', element: Leave },
  { path: '/overtime', name: 'Overtime', element: Overtime },
  { path: '/overtime/new', name: 'New Overtime', element: Overtime },
  { path: '/overtime/:overtimeId', name: 'Overtime Detail', element: Overtime },
  { path: '/inspection', name: 'Inspection', element: Inspection },
  { path: '/inspection/new', name: 'New Inspection', element: Inspection },
  { path: '/inspection/new/:newSection', name: 'New Inspection Section', element: Inspection },
  { path: '/inspection/review', name: 'Inspection Review', element: Inspection },
  { path: '/inspection/:reportId/edit', name: 'Inspection Edit', element: Inspection },
  { path: '/inspection/:reportId', name: 'Inspection Detail', element: Inspection },
  {
    path: '/report/inspection',
    element: () => <Navigate to="/inspection" replace />,
  },
  {
    path: '/report/inspection/new',
    element: () => <Navigate to="/inspection/new" replace />,
  },
  {
    path: '/report/inspection/new/:newSection',
    name: 'Inspection New Section Legacy',
    element: ReportInspectionNewSectionRedirect,
  },
  {
    path: '/report/inspection/:reportId',
    name: 'Inspection Detail Legacy',
    element: ReportInspectionDetailRedirect,
  },
  { path: '/report/:reportType', name: 'Reports', element: Reports },
  { path: '/report/:reportType/new', name: 'New Report', element: Reports },
  { path: '/report/:reportType/new/:newSection', name: 'New Report Section', element: Reports },
  { path: '/report/:reportType/:reportId', name: 'Report Detail', element: Reports },
  { path: '/staff/details', name: 'Staff Details', element: StaffDetails },
  {
    path: '/staff/leave-management',
    name: 'Leave Management',
    element: StaffLeaveManagementRedirect,
  },
  { path: '/staff/leave-management/leaves', name: 'All Leaves', element: LeaveManagement },
  { path: '/staff/leave-management/set-leaves', name: 'Set Leaves', element: LeaveManagement },
  {
    path: '/staff/leave-management/set-holidays',
    name: 'Set Holidays',
    element: LeaveManagement,
  },
  { path: '/staff/leave-management/overtime', name: 'Overtime Records', element: LeaveManagement },
  { path: '/staff/leave-management/rules', name: 'Leave Workflow', element: LeaveManagement },
  {
    path: '/staff/leave-management/record/:leaveId',
    name: 'Leave Record Detail',
    element: LeaveManagement,
  },
  {
    path: '/staff/leave-management/:legacyLeaveId',
    name: 'Leave Record Detail Legacy',
    element: LegacyStaffLeaveManagementRouteRedirect,
  },
  {
    path: '/staff/overtime-management',
    name: 'Overtime Management',
    element: StaffOvertimeManagementRedirect,
  },
  {
    path: '/staff/overtime-management/records',
    name: 'Overtime Records',
    element: OvertimeManagement,
  },
  { path: '/staff/overtime-management/rules', name: 'Set OT Rules', element: OvertimeManagement },
  {
    path: '/staff/overtime-management/record/:overtimeRouteKey',
    name: 'Overtime Record Detail',
    element: OvertimeManagement,
  },
  {
    path: '/staff/overtime-management/:legacyOvertimeRouteKey',
    name: 'Overtime Record Detail Legacy',
    element: LegacyStaffOvertimeManagementRouteRedirect,
  },
  {
    path: '/staff/leave',
    name: 'Leave Management Legacy',
    element: LegacyLeaveManagementRedirect,
  },
  {
    path: '/staff/leave/:leaveId',
    name: 'Leave Record Detail Legacy',
    element: LegacyLeaveManagementDetailRedirect,
  },
  { path: '/staff/salary-claims', name: 'Salary and Claims', element: StaffSalaryClaimsRedirect },
  { path: '/staff/salary-claims/claims', name: 'Claim Records', element: SalaryClaimsManagement },
  { path: '/staff/salary-claims/salary', name: 'Salary Records', element: SalaryClaimsManagement },
  // Legacy set-salary routes — redirect to /staff/set-salary
  {
    path: '/staff/salary-claims/set-salary',
    element: () => <Navigate to="/staff/set-salary/set-salary" replace />,
  },
  {
    path: '/staff/salary-claims/set-ot-rate',
    element: () => <Navigate to="/staff/set-salary/set-ot-rate" replace />,
  },
  {
    path: '/staff/salary-claims/workflow-rules',
    element: () => <Navigate to="/staff/set-salary/workflow-rules" replace />,
  },
  {
    path: '/staff/salary-claims/company-legal',
    element: () => <Navigate to="/staff/set-salary/company-legal" replace />,
  },
  {
    path: '/staff/salary-claims/assignment/new',
    element: () => <Navigate to="/staff/set-salary/assignment/new" replace />,
  },
  {
    path: '/staff/salary-claims/assignment/:assignmentId/edit',
    element: LegacySalaryAssignmentEditRedirect,
  },
  {
    path: '/staff/salary-claims/assignment/:assignmentId/view',
    element: LegacySalaryAssignmentViewRedirect,
  },
  // Salary Settings — standalone module at /staff/set-salary
  {
    path: '/staff/set-salary',
    element: () => <Navigate to="/staff/set-salary/set-salary" replace />,
  },
  { path: '/staff/set-salary/set-salary', name: 'Set Salary', element: SalaryClaimsManagement },
  { path: '/staff/set-salary/set-ot-rate', name: 'Set OT Rate', element: SalaryClaimsManagement },
  {
    path: '/staff/set-salary/workflow-rules',
    name: 'Salary Workflow',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/set-salary/company-legal',
    name: 'Company Legal Information',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/set-salary/assignment/new',
    name: 'Create Salary Assignment',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/set-salary/assignment/:assignmentId/edit',
    name: 'Edit Salary Assignment',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/set-salary/assignment/:assignmentId/view',
    name: 'View Salary Assignment',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/salary-claims/overtime/:overtimeRouteKey',
    name: 'Overtime Records Detail Legacy',
    element: LegacySalaryClaimsOvertimeRedirect,
  },
  {
    path: '/staff/salary-claims/claim/:claimId',
    name: 'Salary and Claims Detail',
    element: SalaryClaimsManagement,
  },
  {
    path: '/staff/salary-claims/:legacyClaimId',
    name: 'Salary and Claims Detail Legacy',
    element: LegacyStaffSalaryClaimsRouteRedirect,
  },
  { path: '/staff/shift-settings', name: 'Shift Settings', element: ShiftSettings },
  { path: '/staff/profile/:id', name: 'Staff Profile', element: StaffProfile },
  {
    path: '/roster',
    name: 'Roster Management',
    element: () => <Navigate to="/roster/overview" replace />,
  },
  { path: '/roster/overview', name: 'Overview', element: RosterManagement },
  { path: '/roster/schedule', name: 'Schedule', element: RosterManagement },
  { path: '/roster/shift-settings', name: 'Shift Settings', element: RosterManagement },
  { path: '/team/details', name: 'Team Details', element: TeamDetails },
  { path: '/team/details/:id', name: 'Team View', element: TeamView },
  { path: '/messages', name: 'Messages', element: Messages },
  { path: '/settings', name: 'Settings', element: Settings },
  { path: '/settings/role-permissions', name: 'Role Permissions', element: Settings },
  { path: '/settings/dashboard-visibility', name: 'Dashboard Visibility', element: Settings },
  { path: '/forms', name: 'Forms', element: FormControl, exact: true },
  { path: '/forms/form-control', name: 'Form Control', element: FormControl },
  { path: '/forms/select', name: 'Select', element: Select },
  { path: '/forms/checks-radios', name: 'Checks & Radios', element: ChecksRadios },
  { path: '/forms/range', name: 'Range', element: Range },
  { path: '/forms/floating-labels', name: 'Floating Labels', element: FloatingLabels },
  { path: '/forms/layout', name: 'Layout', element: Layout },
  { path: '/forms/validation', name: 'Validation', element: Validation },
  { path: '/icons', exact: true, name: 'Icons', element: CoreUIIcons },
  { path: '/icons/coreui-icons', name: 'CoreUI Icons', element: CoreUIIcons },
  { path: '/icons/flags', name: 'Flags', element: Flags },
  { path: '/icons/brands', name: 'Brands', element: Brands },
  {
    path: '/notifications/leave',
    name: 'Workflow Notifications',
    element: LegacyWorkflowNotificationsAliasRedirect,
  },
  { path: '/notifications/alerts', name: 'Alerts', element: Alerts },
  { path: '/notifications/badges', name: 'Badges', element: Badges },
  { path: '/notifications/toasts', name: 'Toasts', element: Toasts },
]

export default routes
