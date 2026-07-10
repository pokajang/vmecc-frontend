import React, { useCallback, useEffect, useState } from 'react'
import {
  CButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { X } from 'lucide-react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const DRAWER_EXIT_MS = 350

const hasActiveOverlay = () => {
  if (typeof document === 'undefined') return true

  return Boolean(
    document.querySelector('.offcanvas.show, .offcanvas.showing, .modal.show') ||
      document.body.classList.contains('modal-open'),
  )
}

const releaseBodyScrollIfIdle = () => {
  if (typeof document === 'undefined' || hasActiveOverlay()) return

  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
}

const MobileBottomDrawer = ({
  visible,
  title,
  titleAction = null,
  headerAction = null,
  children,
  onClose,
  className = '',
  bodyClassName = '',
  panelRef,
  closeDisabled = false,
  closeLabel,
  ...offcanvasProps
}) => {
  const [shouldRender, setShouldRender] = useState(Boolean(visible))

  const handlePanelRef = useCallback(
    (element) => {
      if (typeof panelRef === 'function') {
        panelRef(element)
      }
    },
    [panelRef],
  )

  useEffect(() => {
    if (visible) {
      // Keep CoreUI mounted across open/close transitions so its scroll-lock cleanup runs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true)
      return undefined
    }

    const timer = window.setTimeout(() => {
      setShouldRender(false)
      releaseBodyScrollIfIdle()
    }, DRAWER_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return undefined

    const backdrops = document.querySelectorAll('.offcanvas-backdrop')
    const backdrop = backdrops[backdrops.length - 1]
    if (!backdrop) return undefined

    backdrop.setAttribute('tabindex', '-1')
    backdrop.setAttribute('aria-hidden', 'true')
    return undefined
  }, [visible])

  useEffect(
    () => () => {
      window.setTimeout(releaseBodyScrollIfIdle, 0)
    },
    [],
  )

  if (!shouldRender) return null

  const handleCoreUiHide = () => {
    if (visible && !closeDisabled) onClose?.()
  }

  return (
    <COffcanvas
      {...offcanvasProps}
      visible={visible}
      onHide={handleCoreUiHide}
      placement="bottom"
      aria-label={offcanvasProps['aria-label'] || (typeof title === 'string' ? title : undefined)}
      ref={handlePanelRef}
      className={buildClassName('mobile-bottom-drawer inspection-mobile-setup-drawer', className)}
    >
      <COffcanvasHeader className="mobile-bottom-drawer__header inspection-mobile-setup-drawer__header">
        <div className="mobile-bottom-drawer__title-row inspection-mobile-setup-drawer__title-row">
          <COffcanvasTitle className="mobile-bottom-drawer__title inspection-mobile-setup-drawer__title">
            {title}
          </COffcanvasTitle>
          {titleAction}
        </div>
        <div className="mobile-bottom-drawer__actions inspection-mobile-setup-drawer__actions">
          {headerAction}
          <CButton
            type="button"
            color="link"
            className="mobile-bottom-drawer__close inspection-mobile-setup-drawer__close p-1 text-body-secondary"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={closeLabel || (typeof title === 'string' ? `Close ${title}` : 'Close')}
          >
            <X size={18} />
          </CButton>
        </div>
      </COffcanvasHeader>
      <COffcanvasBody
        className={buildClassName(
          'mobile-bottom-drawer__body inspection-mobile-setup-drawer__body',
          bodyClassName,
        )}
      >
        {children}
      </COffcanvasBody>
    </COffcanvas>
  )
}

export default MobileBottomDrawer
