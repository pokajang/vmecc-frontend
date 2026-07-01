import React, { useCallback, useEffect, useId, useRef } from 'react'
import { ChevronLeft, X } from 'lucide-react'

import useFocusTrap from 'src/hooks/useFocusTrap'

const MobileOverlayShell = ({
  open,
  title,
  count = null,
  ariaLabel,
  headerActions = null,
  onClose,
  onBack,
  onEscape,
  children,
  returnFocusRef,
  className = '',
  bodyClassName = '',
}) => {
  const headerRef = useRef(null)
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const titleId = useId()
  const hasBackButton = Boolean(onBack)

  useEffect(() => {
    if (!open) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  const handleEscape = useCallback(() => {
    if (onEscape) {
      onEscape()
      return
    }
    if (hasBackButton) {
      onBack?.()
      return
    }
    onClose?.()
  }, [hasBackButton, onBack, onClose, onEscape])

  useFocusTrap({
    enabled: open,
    containerRef: panelRef,
    initialFocusRef: hasBackButton ? headerRef : closeButtonRef,
    returnFocusRef,
    onEscape: handleEscape,
  })

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="mobile-nav-sheet-backdrop mobile-overlay-backdrop show"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      <section
        ref={panelRef}
        className={`mobile-nav-sheet mobile-overlay-shell show${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel && !title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
      >
        <div
          className={`mobile-nav-sheet-header mobile-overlay-shell-header${
            hasBackButton ? ' has-back' : ''
          }`}
          ref={headerRef}
          tabIndex={-1}
        >
          <div className="mobile-overlay-shell-leading">
            {hasBackButton && (
              <button
                type="button"
                className="mobile-nav-sheet-icon-btn mobile-overlay-shell-icon-btn"
                onClick={onBack}
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="mobile-overlay-shell-title">
              <span id={titleId} className="mobile-overlay-shell-title-text">
                {title}
              </span>
              {count > 0 && <span className="mobile-overlay-shell-count">{count}</span>}
            </div>
          </div>
          <div className="mobile-overlay-shell-actions">
            {headerActions}
            <button
              ref={closeButtonRef}
              type="button"
              className="mobile-nav-sheet-icon-btn mobile-overlay-shell-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className={`mobile-nav-sheet-body mobile-overlay-shell-body${bodyClassName ? ` ${bodyClassName}` : ''}`}
        >
          {children}
        </div>
      </section>
    </>
  )
}

export default MobileOverlayShell
