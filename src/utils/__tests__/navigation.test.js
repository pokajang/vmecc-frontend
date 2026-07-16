import { describe, expect, it } from 'vitest'
import { CNavItem, CNavTitle } from '@coreui/react'

import { PWA_INSTALL_ACTION } from 'src/constants/pwa'
import { getVisibleNavigationWithOptions } from '../navigation'

const installNav = [
  { component: CNavTitle, name: 'Home' },
  { component: CNavItem, name: 'Install VMECC', action: PWA_INSTALL_ACTION },
]

describe('navigation install visibility', () => {
  it('keeps the install nav item visible when installation is still available', () => {
    const visible = getVisibleNavigationWithOptions(installNav, null, 0, {
      showNavInstallItem: true,
    })

    expect(visible.some((item) => item.action === PWA_INSTALL_ACTION)).toBe(true)
    expect(visible.some((item) => item.name === 'Home')).toBe(true)
  })

  it('removes the install nav item when the app is already installed', () => {
    const visible = getVisibleNavigationWithOptions(installNav, null, 0, {
      showNavInstallItem: false,
    })

    expect(visible.some((item) => item.action === PWA_INSTALL_ACTION)).toBe(false)
  })
})

describe('system administrator navigation visibility', () => {
  it('retains every RBAC-controlled navigation route without permission rows', () => {
    const protectedRoutes = [
      '/dashboard',
      '/messages',
      '/leave',
      '/overtime',
      '/payroll',
      '/admin/users',
      '/admin/audit',
      '/admin/ai-helper-reports',
      '/admin/feedback-reports',
      '/admin/ai-helper-knowledge',
      '/settings',
      '/staff/details',
      '/staff/leave-management/leaves',
      '/staff/salary-claims/claims',
      '/staff/overtime-management/records',
      '/staff/set-salary/set-salary',
      '/staff/shift-settings',
      '/team/details',
      '/roster/overview',
      '/reporting-settings/inspection',
      '/inspection',
      '/report/erco',
      '/report/drill',
      '/report/fitness-test',
    ]
    const navigation = protectedRoutes.map((to) => ({ component: CNavItem, name: to, to }))
    const user = { roles: ['System Administrator'], permissions: [] }

    const visible = getVisibleNavigationWithOptions(navigation, user, 0, {
      overtimeEligible: true,
      showNavInstallItem: false,
    })

    expect(visible.map((item) => item.to)).toEqual(protectedRoutes)
  })
})
