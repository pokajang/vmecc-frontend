import React, { useCallback, useEffect, useRef, useState } from 'react'
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

const focusDocumentFallback = () => {
  if (typeof document === 'undefined') return
  const target = document.querySelector('main, [role="main"]') || document.body
  if (!target || typeof target.focus !== 'function') return
  const hadTabIndex = target.hasAttribute('tabindex')
  if (!hadTabIndex) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
  if (!hadTabIndex) target.removeAttribute('tabindex')
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
  restoreFocusOnClose = true,
  onAfterClose,
  ...offcanvasProps
}) => {
  const [shouldRender, setShouldRender] = useState(Boolean(visible))
  const restoreFocusRef = useRef(
    visible && typeof document !== 'undefined' ? document.activeElement : null,
  )
  const restoreFocusOnCloseRef = useRef(restoreFocusOnClose)
  const onAfterCloseRef = useRef(onAfterClose)

  useEffect(() => {
    restoreFocusOnCloseRef.current = restoreFocusOnClose
    onAfterCloseRef.current = onAfterClose
  }, [onAfterClose, restoreFocusOnClose])

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
      if (typeof document !== 'undefined' && !restoreFocusRef.current) {
        restoreFocusRef.current = document.activeElement
      }
      // Keep CoreUI mounted across open/close transitions so its scroll-lock cleanup runs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true)
      return undefined
    }

    const timer = window.setTimeout(() => {
      setShouldRender(false)
      releaseBodyScrollIfIdle()
      const restoreTarget = restoreFocusRef.current
      restoreFocusRef.current = null
      if (
        restoreFocusOnCloseRef.current &&
        restoreTarget?.isConnected &&
        typeof restoreTarget.focus === 'function'
      ) {
        restoreTarget.focus({ preventScroll: true })
      } else if (!restoreFocusOnCloseRef.current && document.activeElement === restoreTarget) {
        focusDocumentFallback()
      }
      onAfterCloseRef.current?.()
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
      const restoreTarget = restoreFocusRef.current
      restoreFocusRef.current = null
      if (
        restoreFocusOnCloseRef.current &&
        restoreTarget?.isConnected &&
        typeof restoreTarget.focus === 'function'
      ) {
        restoreTarget.focus({ preventScroll: true })
      } else if (!restoreFocusOnCloseRef.current && document.activeElement === restoreTarget) {
        focusDocumentFallback()
      }
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
            <X size={18} aria-hidden="true" />
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
