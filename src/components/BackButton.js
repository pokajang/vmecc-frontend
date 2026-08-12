import React, { forwardRef } from 'react'
import { CButton } from '@coreui/react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const BackButtonControl = forwardRef(function BackButtonControl(
  { onClick, label = 'Back', className = '', style, size = 'sm', iconSize = 18, ...buttonProps },
  ref,
) {
  return (
    <CButton
      {...buttonProps}
      ref={ref}
      type="button"
      color="link"
      variant={undefined}
      size={size}
      className={`back-button ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      <ArrowLeft size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      <span className="back-button__label">{label}</span>
    </CButton>
  )
})

const RoutedBackButton = forwardRef(function RoutedBackButton({ to, ...buttonProps }, ref) {
  const navigate = useNavigate()

  return <BackButtonControl {...buttonProps} ref={ref} onClick={() => navigate(to)} />
})

/**
 * Shared labelled Back navigation.
 * - `to` owns navigation when supplied.
 * - Otherwise the caller-owned `onClick` behavior is preserved.
 * - Visual chrome stays absent while the semantic button and touch target remain.
 */
const BackButton = forwardRef(function BackButton(
  {
    to,
    onClick,
    label = 'Back',
    className = '',
    style,
    size = 'sm',
    iconSize = 18,
    ...buttonProps
  },
  ref,
) {
  const sharedProps = { label, className, style, size, iconSize, ...buttonProps }

  return to ? (
    <RoutedBackButton ref={ref} to={to} {...sharedProps} />
  ) : (
    <BackButtonControl ref={ref} onClick={onClick} {...sharedProps} />
  )
})

export default BackButton
