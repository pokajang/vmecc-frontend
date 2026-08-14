import React from 'react'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import useReportIsMobile from 'src/hooks/useReportIsMobile'

const joinClassNames = (...values) => values.filter(Boolean).join(' ')

const ResponsiveReportDialog = ({
  visible,
  title,
  children,
  footer,
  onClose,
  closeDisabled = false,
  ariaLabel,
  className = '',
  bodyClassName = '',
  footerClassName = '',
  mobileClassName = '',
  mobileBodyClassName = '',
  mobileContentClassName = '',
  desktopFullscreen,
  scrollable = false,
}) => {
  const isMobile = useReportIsMobile()

  const mobileContent = (
    <>
      {mobileBodyClassName ? <div className={mobileBodyClassName}>{children}</div> : children}
      {footer ? (
        <div
          className={joinClassNames(
            'mobile-bottom-drawer__footer d-flex flex-wrap align-items-center justify-content-end gap-2',
            footerClassName,
          )}
        >
          <ActionButtonGroup ariaLabel={`${title} actions`}>{footer}</ActionButtonGroup>
        </div>
      ) : null}
    </>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        aria-label={ariaLabel}
        className={mobileClassName}
        onClose={onClose}
        closeDisabled={closeDisabled}
      >
        {mobileContentClassName ? (
          <div className={mobileContentClassName}>{mobileContent}</div>
        ) : (
          mobileContent
        )}
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      alignment="center"
      visible={visible}
      onClose={closeDisabled ? undefined : onClose}
      fullscreen={desktopFullscreen}
      scrollable={scrollable}
      className={className}
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className={bodyClassName}>{children}</CModalBody>
      {footer ? (
        <CModalFooter>
          <ActionButtonGroup ariaLabel={`${title} actions`}>{footer}</ActionButtonGroup>
        </CModalFooter>
      ) : null}
    </CModal>
  )
}

export default ResponsiveReportDialog
