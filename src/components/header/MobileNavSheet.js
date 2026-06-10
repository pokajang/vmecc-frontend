import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CBadge } from '@coreui/react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LogOut,
  Settings,
  User,
  WalletCards,
} from 'lucide-react'

import { getPrimaryRoleLabel } from 'src/utils/authz'
import { isTitle } from 'src/utils/navigation'

const collectLeafRows = (items = [], rows) => {
  items.forEach((item) => {
    if (!item) return

    if (isTitle(item)) {
      rows.push({ type: 'section', label: item.name || '' })
      return
    }

    if (item.to || item.href) {
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
  returnFocusRef,
}) => {
  const [activeGroup, setActiveGroup] = useState(null)
  const headerRef = useRef(null)
  const wasOpenRef = useRef(open)

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => headerRef.current?.focus(), 0)
      return () => clearTimeout(timer)
    }

    if (wasOpenRef.current && returnFocusRef?.current) {
      returnFocusRef.current.focus()
    }
  }, [open, returnFocusRef])

  useEffect(() => {
    wasOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (mode === 'menu' && activeGroup) {
        setActiveGroup(null)
        return
      }
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, mode, activeGroup, onClose])

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

  if (!open) return null

  const title = mode === 'account' ? 'Account' : activeGroup?.name ? activeGroup.name : 'Menu'
  const hasBackButton = mode === 'menu' && Boolean(activeGroup)

  const renderMenuRows = () => {
    const rows = activeGroup ? secondLevelRows : topLevelRows

    return (
      <div className="mobile-nav-sheet-action-grid mobile-nav-sheet-action-grid-menu">
        {rows.map((row) => {
          if (row.type === 'section') {
            return (
              <div
                key={row.key}
                className="mobile-nav-sheet-section mobile-nav-sheet-section-grid mobile-nav-sheet-span-2"
              >
                {row.label}
              </div>
            )
          }

          if (row.type === 'group') {
            return (
              <button
                key={row.key}
                type="button"
                className="mobile-nav-sheet-row mobile-nav-sheet-tile"
                onClick={() => setActiveGroup(row.item)}
              >
                <span className="mobile-nav-sheet-row-main">
                  {row.item.icon && (
                    <span className="mobile-nav-sheet-row-icon">{row.item.icon}</span>
                  )}
                  <span>{row.item.name}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            )
          }

          const { item } = row
          return (
            <button
              key={row.key}
              type="button"
              className="mobile-nav-sheet-row mobile-nav-sheet-tile"
              onClick={() => onNavigate(item)}
            >
              <span className="mobile-nav-sheet-row-main">
                {item.icon && <span className="mobile-nav-sheet-row-icon">{item.icon}</span>}
                <span>{item.name}</span>
                {item.href && <ExternalLink size={14} className="text-body-tertiary" />}
              </span>
              {item.badge && (
                <CBadge color={item.badge.color} className={item.badge.className || ''}>
                  {item.badge.text}
                </CBadge>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const renderAccountRows = () => (
    <>
      <div className="mobile-nav-sheet-user-card">
        <div className="small text-body-secondary mb-1">Signed in as</div>
        <div className="fw-semibold">{user?.name || user?.email || 'User'}</div>
        {primaryRole && <div className="small text-body-secondary mt-1">{primaryRole}</div>}
        {secondaryRoles.length > 0 && (
          <div className="small text-body-secondary">{secondaryRoles.join(', ')}</div>
        )}
      </div>

      <div className="mobile-nav-sheet-section">Account</div>
      <div className="mobile-nav-sheet-action-grid">
        <button
          type="button"
          className="mobile-nav-sheet-row mobile-nav-sheet-tile"
          onClick={() => onNavigate({ to: '/profile' })}
        >
          <span className="mobile-nav-sheet-row-main">
            <User size={16} />
            <span>Profile</span>
          </span>
        </button>
        <button
          type="button"
          className="mobile-nav-sheet-row mobile-nav-sheet-tile"
          onClick={() => onNavigate({ to: '/profile/security' })}
        >
          <span className="mobile-nav-sheet-row-main">
            <Settings size={16} />
            <span>Settings</span>
          </span>
        </button>
      </div>

      {canQuickActions && <div className="mobile-nav-sheet-section">Quick Actions</div>}
      {canQuickActions && (
        <div className="mobile-nav-sheet-action-grid">
          {canClaim && (
            <button
              type="button"
              className="mobile-nav-sheet-row mobile-nav-sheet-tile"
              onClick={() => onNavigate({ to: '/payroll/claims/new' })}
            >
              <span className="mobile-nav-sheet-row-main">
                <WalletCards size={16} />
                <span>New Claim</span>
              </span>
            </button>
          )}
          {canLeave && (
            <button
              type="button"
              className="mobile-nav-sheet-row mobile-nav-sheet-tile"
              onClick={() => onNavigate({ to: '/leave/new' })}
            >
              <span className="mobile-nav-sheet-row-main">
                <CalendarDays size={16} />
                <span>Apply Leave</span>
              </span>
            </button>
          )}
          {canOvertime && (
            <button
              type="button"
              className="mobile-nav-sheet-row mobile-nav-sheet-tile"
              onClick={() => onNavigate({ to: '/overtime/new' })}
            >
              <span className="mobile-nav-sheet-row-main">
                <Clock3 size={16} />
                <span>Apply Overtime</span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mobile-nav-sheet-section">Session</div>
      <div className="mobile-nav-sheet-action-grid">
        <button
          type="button"
          className="mobile-nav-sheet-row mobile-nav-sheet-tile mobile-nav-sheet-tile-danger mobile-nav-sheet-span-2"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <span className="mobile-nav-sheet-row-main">
            <LogOut size={16} />
            <span>{isLoggingOut ? 'Signing out...' : 'Log out'}</span>
          </span>
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        type="button"
        className={`mobile-nav-sheet-backdrop${open ? ' show' : ''}`}
        onClick={onClose}
        aria-label="Close menu overlay"
      />
      <section
        className={`mobile-nav-sheet${open ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} drawer`}
      >
        <div
          className={`mobile-nav-sheet-header${hasBackButton ? ' has-back' : ''}`}
          ref={headerRef}
          tabIndex={-1}
        >
          {hasBackButton && (
            <button
              type="button"
              className="mobile-nav-sheet-icon-btn"
              onClick={() => setActiveGroup(null)}
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        <div className="mobile-nav-sheet-body">
          {mode === 'account' ? renderAccountRows() : renderMenuRows()}
        </div>
      </section>
    </>
  )
}

export default MobileNavSheet
