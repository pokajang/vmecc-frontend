import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import useFocusTrap from 'src/hooks/useFocusTrap'

const NotificationDrawer = ({
  open,
  onClose,
  title,
  count,
  countColor,
  children,
  initialFocusRef,
  returnFocusRef,
}) => {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)

  useFocusTrap({
    enabled: open,
    containerRef: panelRef,
    initialFocusRef: initialFocusRef || closeButtonRef,
    returnFocusRef,
    onEscape: onClose,
  })

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
          <button
            ref={closeButtonRef}
            className="notification-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
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
