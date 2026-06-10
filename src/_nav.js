import React from 'react'
import { CNavItem, CNavTitle } from '@coreui/react'
import {
  CalendarDays,
  Check,
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

const shipCheckBadge = {
  text: <Check size={11} color="#22c55e" strokeWidth={3} />,
  className: 'bg-transparent border-0 p-0 shadow-none',
}

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="nav-icon" size={20} />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavItem,
    name: 'Messages',
    to: '/messages',
    icon: <MessageSquareText className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavTitle,
    name: 'Self Service',
  },
  {
    component: CNavItem,
    name: 'Payroll',
    to: '/payroll',
    icon: <Wallet className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Overtime',
    to: '/overtime',
    icon: <Clock3 className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Leave',
    to: '/leave',
    icon: <CalendarDays className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavTitle,
    name: 'INSPECTION',
  },
  {
    component: CNavItem,
    name: 'Inspect Area',
    to: '/inspection/new',
    matchPrefix: ['/inspection'],
    icon: <ClipboardList className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'REPORTS',
  },
  {
    component: CNavItem,
    name: 'ERCO',
    to: '/report/erco/new',
    matchPrefix: ['/report/erco'],
    icon: <TriangleAlert className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Drill',
    to: '/report/drill/new',
    matchPrefix: ['/report/drill'],
    icon: <Wrench className="nav-icon" size={20} />,
  },
  {
    component: CNavItem,
    name: 'Fitness Test',
    to: '/report/fitness-test/new',
    matchPrefix: ['/report/fitness-test'],
    icon: <Dumbbell className="nav-icon" size={20} />,
  },
  {
    component: CNavTitle,
    name: 'System Admin',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/admin/users',
    icon: <Users className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Audit',
    to: '/admin/audit',
    icon: <ClipboardList className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/settings',
    icon: <Settings className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavTitle,
    name: 'Staff',
  },
  {
    component: CNavItem,
    name: 'Staff Directory',
    to: '/staff/details',
    icon: <UserRound className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Leave Management',
    to: '/staff/leave-management',
    icon: <CalendarDays className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Overtime Management',
    to: '/staff/overtime-management',
    icon: <Clock3 className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavTitle,
    name: 'Team',
  },
  {
    component: CNavItem,
    name: 'Team Directory',
    to: '/team/details',
    icon: <UsersRound className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Roster Management',
    to: '/roster/overview',
    icon: <LayoutGrid className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavItem,
    name: 'Shift Settings',
    to: '/staff/shift-settings',
    icon: <Settings className="nav-icon" size={20} />,
    badge: shipCheckBadge,
  },
  {
    component: CNavTitle,
    name: 'Financial',
  },
  {
    component: CNavItem,
    name: 'Salary & Claims',
    badge: shipCheckBadge,
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
    badge: shipCheckBadge,
  },
]

export default _nav
