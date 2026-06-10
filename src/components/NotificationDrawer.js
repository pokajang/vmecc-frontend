import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const NotificationDrawer = ({ open, onClose, title, count, countColor, children }) => {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && panelRef.current) panelRef.current.focus()
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`notification-drawer-backdrop${open ? ' show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`notification-drawer${open ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="notification-drawer-header">
          <span className="notification-drawer-title">
            {title}
            {count > 0 && (
              <span
                className="notification-drawer-count"
                style={countColor ? { background: countColor.bg, color: countColor.text } : {}}
              >
                {count}
              </span>
            )}
          </span>
          <button className="notification-drawer-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="notification-drawer-body">{children}</div>
      </div>
    </>
  )
}

export default NotificationDrawer
