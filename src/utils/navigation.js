import { hasAnyPermission, hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { PWA_INSTALL_ACTION } from 'src/constants/pwa'
import { isModuleEnabled } from 'src/utils/modules'

export const isTitle = (item) => !item?.to && !item?.href && !item?.action && !item?.items

export const applyRoleVisibility = (items, authUser, options = {}) => {
  const overtimeEligible =
    typeof options?.overtimeEligible === 'boolean' ? options.overtimeEligible : null
  const moduleActivation = options?.moduleActivation || null
  const showNavInstallItem = options?.showNavInstallItem !== false

  const filtered = items.reduce((acc, item) => {
    if (item.action === PWA_INSTALL_ACTION) {
      if (!showNavInstallItem) return acc
      acc.push(item)
      return acc
    }

    if (
      item.to === '/dashboard' &&
      (!hasPermission(authUser, 'self.dashboard') ||
        !isModuleEnabled(moduleActivation, 'dashboard'))
    ) {
      return acc
    }
    if (
      item.to === '/messages' &&
      (!hasPermission(authUser, 'self.messages') || !isModuleEnabled(moduleActivation, 'messages'))
    ) {
      return acc
    }
    if (item.to === '/leave' && !hasPermission(authUser, 'self.leave')) return acc
    if (
      item.to === '/overtime' &&
      (!hasPermission(authUser, 'self.overtime') || overtimeEligible === false)
    ) {
      return acc
    }
    if (
      item.to === '/payroll' &&
      (!hasPermission(authUser, 'self.payroll') ||
        !isModuleEnabled(moduleActivation, 'payroll.self_service'))
    ) {
      return acc
    }

    if (item.to === '/admin/users' && !hasPermission(authUser, 'users.manage')) return acc
    if (item.to === '/admin/audit' && !hasPermission(authUser, 'audit.view')) return acc
    if (item.to === '/admin/ai-helper-reports' && !isSystemAdministrator(authUser)) return acc
    if (item.to === '/admin/feedback-reports' && !isSystemAdministrator(authUser)) return acc
    if (item.to === '/admin/ai-helper-knowledge' && !isSystemAdministrator(authUser)) return acc
    if (item.to === '/settings' && !hasPermission(authUser, 'settings.manage')) return acc
    if (
      item.to === '/staff/details' &&
      !hasAnyPermission(authUser, ['staff.view', 'staff.manage'])
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/staff/leave-management') &&
      !hasPermission(authUser, 'staff.leave.manage')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/staff/salary-claims') &&
      (!hasPermission(authUser, 'staff.salary.manage') ||
        !isModuleEnabled(moduleActivation, 'payroll.salary_claims_management'))
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/staff/overtime-management') &&
      !hasPermission(authUser, 'staff.overtime.manage')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/staff/set-salary') &&
      (!hasPermission(authUser, 'staff.salary.manage') ||
        !isModuleEnabled(moduleActivation, 'payroll.salary_settings'))
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/staff/shift-settings') &&
      !hasAnyPermission(authUser, ['staff.leave.manage', 'staff.salary.manage'])
    ) {
      return acc
    }
    if (
      item.to === '/team/details' &&
      !hasAnyPermission(authUser, ['teams.view', 'teams.manage'])
    ) {
      return acc
    }
    if (String(item.to || '').startsWith('/roster') && !hasPermission(authUser, 'rosters.manage')) {
      return acc
    }
    if (String(item.to || '').startsWith('/reporting-settings')) {
      if (!hasPermission(authUser, 'settings.manage')) {
        return acc
      }
    } else if (
      String(item.to || '').startsWith('/inspection') &&
      !hasPermission(authUser, 'reports.inspection.view')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/report/erco') &&
      !hasPermission(authUser, 'reports.erco.view')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/report/drill') &&
      !hasPermission(authUser, 'reports.drill.view')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/report/fitness-test') &&
      !hasPermission(authUser, 'reports.fitness.view')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/report/er-assessment') &&
      !hasPermission(authUser, 'reports.er_assessment.view')
    ) {
      return acc
    }
    if (
      String(item.to || '').startsWith('/report') &&
      !hasAnyPermission(authUser, [
        'reports.erco.view',
        'reports.drill.view',
        'reports.fitness.view',
        'reports.er_assessment.view',
      ])
    ) {
      return acc
    }

    if (item.items) {
      const filteredItems = applyRoleVisibility(item.items, authUser, options)
      if (filteredItems.length === 0) return acc
      if (filteredItems.length === 1) {
        acc.push({ ...filteredItems[0], icon: filteredItems[0].icon || item.icon })
        return acc
      }
      acc.push({ ...item, items: filteredItems })
      return acc
    }

    acc.push(item)
    return acc
  }, [])

  return filtered.filter((item, index) => {
    if (!isTitle(item)) return true
    for (let i = index + 1; i < filtered.length; i++) {
      if (isTitle(filtered[i])) break
      if (filtered[i].to || filtered[i].href || filtered[i].action) return true
    }
    return false
  })
}

export const applyMessageBadge = (items, unreadCount) =>
  items.map((item) => {
    if (item.items) {
      return { ...item, items: applyMessageBadge(item.items, unreadCount) }
    }
    if (item.to === '/messages') {
      const messageBadge =
        unreadCount > 0
          ? { color: 'light', text: String(unreadCount), className: 'sidebar-message-badge' }
          : null
      return { ...item, badge: messageBadge || item.badge }
    }
    return item
  })

export const getVisibleNavigation = (items, authUser, unreadCount = 0) =>
  applyMessageBadge(applyRoleVisibility(items, authUser), unreadCount)

export const getVisibleNavigationWithOptions = (items, authUser, unreadCount = 0, options = {}) =>
  applyMessageBadge(applyRoleVisibility(items, authUser, options), unreadCount)
