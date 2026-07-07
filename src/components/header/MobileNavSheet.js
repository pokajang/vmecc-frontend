import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CBadge } from '@coreui/react'
import {
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  ClockPlus,
  ExternalLink,
  FilePlus2,
  Flag,
  History,
  LogOut,
  ReceiptText,
  Settings,
  User,
} from 'lucide-react'

import { getPrimaryRoleLabel } from 'src/utils/authz'
import { isTitle } from 'src/utils/navigation'
import MobileOverlayItem from './MobileOverlayItem'
import MobileOverlaySection from './MobileOverlaySection'
import MobileOverlayShell from './MobileOverlayShell'
import { preloadInspectionRoute } from 'src/routePreloaders'

const isInspectionRoute = (item = {}) => String(item.to || '').startsWith('/inspection')

const hasInspectionRoute = (items = []) =>
  items.some((item) => {
    if (isInspectionRoute(item)) return true
    return Array.isArray(item?.items) && hasInspectionRoute(item.items)
  })

const collectLeafRows = (items = [], rows) => {
  items.forEach((item) => {
    if (!item) return

    if (isTitle(item)) {
      rows.push({ type: 'section', label: item.name || '' })
      return
    }

    if (item.to || item.href || item.action) {
      rows.push({ type: 'link', item })
      return
    }

    if (item.items) {
      if (item.name) {
        rows.push({ type: 'section', label: item.name })
      }
      collectLeafRows(item.items, rows)
    }
  })
}

const MobileNavSheet = ({
  open,
  mode,
  onClose,
  onNavigate,
  onLogout,
  menuData,
  user,
  canClaim,
  canLeave,
  canOvertime,
  isLoggingOut,
  onReportIssue,
  returnFocusRef,
}) => {
  const [activeGroup, setActiveGroup] = useState(null)

  const handleEscape = useCallback(() => {
    if (mode === 'menu' && activeGroup) {
      setActiveGroup(null)
      return
    }
    onClose()
  }, [activeGroup, mode, onClose])

  const topLevelRows = useMemo(
    () =>
      (menuData || []).map((item) => {
        if (isTitle(item)) {
          return { type: 'section', key: `title-${item.name}`, label: item.name || '' }
        }
        if (item.items) {
          return { type: 'group', key: `group-${item.name}`, item }
        }
        return { type: 'link', key: `link-${item.to || item.href || item.name}`, item }
      }),
    [menuData],
  )

  const secondLevelRows = useMemo(() => {
    if (!activeGroup?.items) return []
    const rows = []
    collectLeafRows(activeGroup.items, rows)
    return rows.map((row, index) => ({ ...row, key: `second-${index}` }))
  }, [activeGroup])

  const primaryRole = getPrimaryRoleLabel(user)
  const secondaryRoles = (user?.roles || []).filter((role) => role !== primaryRole)
  const canQuickActions = canClaim || canLeave || canOvertime
  const canMyRecords = canClaim || canLeave || canOvertime

  useEffect(() => {
    if (!open || mode !== 'menu' || !hasInspectionRoute(menuData)) return
    preloadInspectionRoute()
  }, [menuData, mode, open])

  if (!open) return null

  const title = mode === 'account' ? 'Account' : activeGroup?.name ? activeGroup.name : 'Menu'
  const handleBack = mode === 'menu' && activeGroup ? () => setActiveGroup(null) : null

  const renderMenuRows = () => {
    const rows = activeGroup ? secondLevelRows : topLevelRows

    return (
      <>
        <div className="mobile-nav-sheet-action-grid mobile-nav-sheet-action-grid-menu">
          {rows.map((row) => {
            if (row.type === 'section') {
              return (
                <MobileOverlaySection key={row.key} className="mobile-nav-sheet-section-grid" span>
                  {row.label}
                </MobileOverlaySection>
              )
            }

            if (row.type === 'group') {
              return (
                <MobileOverlayItem
                  key={row.key}
                  onClick={() => setActiveGroup(row.item)}
                  icon={row.item.icon}
                  label={row.item.name}
                  trailing={<ChevronRight size={16} />}
                />
              )
            }

            const { item } = row
            const preloadProps = isInspectionRoute(item)
              ? {
                  onFocus: preloadInspectionRoute,
                  onPointerEnter: preloadInspectionRoute,
                  onTouchStart: preloadInspectionRoute,
                }
              : {}
            return (
              <MobileOverlayItem
                key={row.key}
                onClick={() => onNavigate(item)}
                {...preloadProps}
                icon={item.icon}
                label={item.name}
                badge={
                  item.badge ? (
                    <CBadge color={item.badge.color} className={item.badge.className || ''}>
                      {item.badge.text}
                    </CBadge>
                  ) : null
                }
                trailing={
                  item.href ? <ExternalLink size={14} className="text-body-tertiary" /> : null
                }
              />
            )
          })}
        </div>
      </>
    )
  }

  const renderAccountRows = () => (
    <>
      <div className="mobile-nav-sheet-user-card">
        <span className="mobile-nav-sheet-user-label">Signed in as</span>
        <span className="mobile-nav-sheet-user-name">{user?.name || user?.email || 'User'}</span>
        {primaryRole && <span className="mobile-nav-sheet-user-role">{primaryRole}</span>}
        {secondaryRoles.length > 0 && (
          <span className="mobile-nav-sheet-user-role">{secondaryRoles.join(', ')}</span>
        )}
      </div>

      {canQuickActions && <MobileOverlaySection>Quick Actions</MobileOverlaySection>}
      {canQuickActions && (
        <div className="mobile-nav-sheet-action-grid">
          {canClaim && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/payroll/claims/new' })}
              icon={<FilePlus2 size={16} />}
              label="New Claim"
            />
          )}
          {canLeave && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/leave/new' })}
              icon={<CalendarPlus size={16} />}
              label="Apply Leave"
            />
          )}
          {canOvertime && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/overtime/new' })}
              icon={<ClockPlus size={16} />}
              label="Apply Overtime"
            />
          )}
        </div>
      )}

      {canMyRecords && <MobileOverlaySection>My Records</MobileOverlaySection>}
      {canMyRecords && (
        <div className="mobile-nav-sheet-action-grid">
          {canClaim && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/payroll' })}
              icon={<ReceiptText size={16} />}
              label="Payroll records"
            />
          )}
          {canLeave && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/leave' })}
              icon={<CalendarCheck size={16} />}
              label="Leave records"
            />
          )}
          {canOvertime && (
            <MobileOverlayItem
              onClick={() => onNavigate({ to: '/overtime' })}
              icon={<History size={16} />}
              label="Overtime records"
            />
          )}
        </div>
      )}

      <MobileOverlaySection>Account</MobileOverlaySection>
      <div className="mobile-nav-sheet-action-grid">
        <MobileOverlayItem
          onClick={() => onNavigate({ to: '/profile' })}
          icon={<User size={16} />}
          label="Profile"
        />
        <MobileOverlayItem
          onClick={() => onNavigate({ to: '/profile/security' })}
          icon={<Settings size={16} />}
          label="Settings"
        />
        <MobileOverlayItem onClick={onReportIssue} icon={<Flag size={16} />} label="Report issue" />
      </div>

      <MobileOverlaySection>Session</MobileOverlaySection>
      <div className="mobile-nav-sheet-inline-actions">
        <MobileOverlayItem
          onClick={onLogout}
          disabled={isLoggingOut}
          icon={<LogOut size={16} />}
          label={isLoggingOut ? 'Signing out...' : 'Log out'}
          danger
          inline
        />
      </div>
    </>
  )

  return (
    <MobileOverlayShell
      open={open}
      title={title}
      ariaLabel={`${title} drawer`}
      onClose={onClose}
      onBack={handleBack}
      returnFocusRef={returnFocusRef}
      onEscape={handleEscape}
    >
      {mode === 'account' ? renderAccountRows() : renderMenuRows()}
    </MobileOverlayShell>
  )
}

export default MobileNavSheet
