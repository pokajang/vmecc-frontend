import React, { useEffect, useRef, useState } from 'react'

const FormActionGroup = ({
  actionsAlign = 'end',
  children,
  leading = null,
  className = '',
  mobileThumb = true,
  mobileBehavior,
  mobileVariant = 'default',
  statusMessage = '',
  showSpacer = true,
  dockAtEnd = false,
  spacerClassName = 'd-md-none',
  ariaLabel = 'Form actions',
}) => {
  const hasLeading = Boolean(leading)
  const hasActions = Boolean(children)
  const resolvedMobileBehavior =
    mobileBehavior ||
    (mobileVariant === 'compact-sticky'
      ? 'compact-sticky'
      : mobileThumb
        ? 'in-flow'
        : 'legacy-in-flow')
  const isSticky = resolvedMobileBehavior === 'sticky'
  const isCompactSticky = resolvedMobileBehavior === 'compact-sticky'
  const supportsEndDocking = isCompactSticky && dockAtEnd
  const [isDockedAtEnd, setIsDockedAtEnd] = useState(false)
  const [mobileDockMetrics, setMobileDockMetrics] = useState(null)
  const isEndDocked = supportsEndDocking && isDockedAtEnd
  const endAnchorRef = useRef(null)
  const groupRef = useRef(null)
  const usesMobileActionLayout = resolvedMobileBehavior !== 'legacy-in-flow'
  const alignStart = actionsAlign === 'start'
  const containerClassName = usesMobileActionLayout
    ? [
        'action-row-thumb',
        `action-row-thumb--${resolvedMobileBehavior}`,
        hasLeading ? 'action-row-thumb--split' : '',
        isCompactSticky && hasLeading ? 'action-row-thumb--has-leading' : '',
      ]
        .filter(Boolean)
        .join(' ')
    : `d-flex flex-wrap align-items-center gap-2 ${
        hasLeading
          ? 'justify-content-between'
          : alignStart
            ? 'justify-content-start'
            : 'justify-content-end'
      }`
  const containerStyle = usesMobileActionLayout
    ? {
        ...(alignStart ? { justifyItems: 'start' } : {}),
        ...(mobileDockMetrics
          ? {
              '--action-row-dock-left': `${mobileDockMetrics.left}px`,
              '--action-row-dock-width': `${mobileDockMetrics.width}px`,
            }
          : {}),
      }
    : undefined
  const actionsStyle = alignStart
    ? {
        justifyContent: 'flex-start',
        justifyItems: 'start',
        marginLeft: 0,
        marginRight: 'auto',
      }
    : undefined
  const spacerClasses = [
    'action-row-thumb-spacer',
    isCompactSticky ? 'action-row-thumb-spacer--compact' : '',
    isCompactSticky && hasLeading ? 'action-row-thumb-spacer--compact-with-leading' : '',
    spacerClassName,
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    if (!supportsEndDocking || typeof window === 'undefined') {
      return undefined
    }

    let frameId = null
    const evaluateDocking = () => {
      frameId = null
      if (!window.matchMedia?.('(max-width: 767.98px)').matches) {
        setIsDockedAtEnd(false)
        return
      }

      const anchor = endAnchorRef.current
      const group = groupRef.current
      if (!anchor || !group) return

      const rootStyle = window.getComputedStyle(document.documentElement)
      const mobileNavHeight = Number.parseFloat(
        rootStyle.getPropertyValue('--mobile-overlay-nav-height'),
      )
      const reservedBottom = (Number.isFinite(mobileNavHeight) ? mobileNavHeight : 64) + 12
      const anchorTop = anchor.getBoundingClientRect().top
      const anchorRect = anchor.getBoundingClientRect()
      const groupHeight = group.getBoundingClientRect().height
      const boundary = window.innerHeight - reservedBottom

      setMobileDockMetrics((current) => {
        const next = {
          left: Math.round(anchorRect.left),
          width: Math.round(anchorRect.width),
        }
        return current?.left === next.left && current?.width === next.width ? current : next
      })
      setIsDockedAtEnd((current) => {
        const threshold = current ? boundary + 8 : boundary - 4
        const shouldDock = anchorTop >= 0 && anchorTop + groupHeight <= threshold
        return current === shouldDock ? current : shouldDock
      })
    }
    const scheduleDockingCheck = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(evaluateDocking)
    }

    scheduleDockingCheck()
    window.addEventListener('scroll', scheduleDockingCheck, { passive: true })
    window.addEventListener('resize', scheduleDockingCheck)
    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(scheduleDockingCheck)
        : null
    if (groupRef.current) resizeObserver?.observe(groupRef.current)
    if (endAnchorRef.current) resizeObserver?.observe(endAnchorRef.current)

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener('scroll', scheduleDockingCheck)
      window.removeEventListener('resize', scheduleDockingCheck)
    }
  }, [supportsEndDocking])

  return (
    <>
      {supportsEndDocking ? (
        <span ref={endAnchorRef} className="action-row-thumb-end-anchor" aria-hidden="true" />
      ) : null}
      <div
        ref={groupRef}
        className={`${containerClassName} ${supportsEndDocking ? (isEndDocked ? 'action-row-thumb--docked-at-end' : 'action-row-thumb--floating') : ''} ${className}`.trim()}
        role="group"
        aria-label={ariaLabel}
        style={containerStyle}
      >
        {isCompactSticky && statusMessage ? (
          <div
            className="action-row-thumb-status text-body-secondary"
            title={statusMessage}
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </div>
        ) : null}
        {hasLeading ? <div className="action-row-thumb-leading">{leading}</div> : null}
        {hasActions ? (
          <div className="action-row-thumb-actions" style={actionsStyle}>
            {children}
          </div>
        ) : null}
      </div>
      {(isSticky || isCompactSticky) && showSpacer ? <div className={spacerClasses} /> : null}
    </>
  )
}

export default FormActionGroup
