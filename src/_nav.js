import React from 'react'
import { CNavItem, CNavTitle } from '@coreui/react'
import {
  CalendarDays,
  Clock3,
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

const _nav = [
  {
    component: CNavTitle,
    name: 'Home',
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Messages',
    to: '/messages',
    icon: <MessageSquareText className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'My Work',
  },
  {
    component: CNavItem,
    name: 'Payroll',
    to: '/payroll',
    icon: <Wallet className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Overtime',
    to: '/overtime',
    icon: <Clock3 className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Leave',
    to: '/leave',
    icon: <CalendarDays className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'Operations',
  },
  {
    component: CNavItem,
    name: 'Staff Directory',
    to: '/staff/details',
    icon: <UserRound className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Leave Management',
    to: '/staff/leave-management',
    icon: <CalendarDays className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Overtime Management',
    to: '/staff/overtime-management',
    icon: <Clock3 className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Salary & Claims',
    to: '/staff/salary-claims/salary',
    matchPrefix: [
      '/staff/salary-claims/claims',
      '/staff/salary-claims/salary',
      '/staff/salary-claims/claim',
      '/staff/salary-claims/overtime',
    ],
    icon: <Wallet className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Salary Settings',
    to: '/staff/set-salary/set-salary',
    matchPrefix: ['/staff/set-salary'],
    icon: <Settings className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'Teams and Roster',
  },
  {
    component: CNavItem,
    name: 'Team Directory',
    to: '/team/details',
    icon: <UsersRound className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Roster Management',
    to: '/roster/overview',
    icon: <LayoutGrid className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Shift Settings',
    to: '/staff/shift-settings',
    icon: <Settings className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'Reports and Inspection',
  },
  {
    component: CNavItem,
    name: 'Inspection',
    to: '/inspection',
    matchPrefix: ['/inspection'],
    icon: <ClipboardList className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'ERCO',
    to: '/report/erco',
    matchPrefix: ['/report/erco'],
    icon: <TriangleAlert className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Drill',
    to: '/report/drill',
    matchPrefix: ['/report/drill'],
    icon: <Wrench className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Fitness Test',
    to: '/report/fitness-test',
    matchPrefix: ['/report/fitness-test'],
    icon: <Dumbbell className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'Admin',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/admin/users',
    icon: <Users className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Audit',
    to: '/admin/audit',
    icon: <ClipboardList className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/settings',
    icon: <Settings className="nav-icon" size={20} />,
  },
]

export default _nav
