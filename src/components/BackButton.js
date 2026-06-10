import React from 'react'
import { CButton } from '@coreui/react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Reusable back button.
 * - If `to` is provided, uses react-router navigate.
 * - Otherwise falls back to onClick handler.
 */
const BackButton = ({
  to,
  onClick,
  label = 'Back',
  className = '',
  style,
  size = 'sm',
  iconSize = 18,
  ...buttonProps
}) => {
  const navigate = useNavigate()
  const handleClick = () => {
    if (to) {
      navigate(to)
      return
    }
    if (onClick) onClick()
  }

  return (
    <CButton
      size={size}
      className={`text-primary px-2 py-1 border-0 shadow-none ${className}`.trim()}
      style={{ backgroundColor: 'rgba(0, 126, 122, 0.1)', ...style }}
      onClick={handleClick}
      {...buttonProps}
    >
      <ArrowLeft size={iconSize} className="me-1" />
      {label}
    </CButton>
  )
}

export default BackButton
