import React from 'react'
import { CButton } from '@coreui/react'

const COLOR_BY_INTENT = {
  neutral: 'secondary',
  primary: 'primary',
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
}

const AppButton = ({
  intent = 'neutral',
  presentation,
  iconOnly = false,
  className = '',
  children,
  ...buttonProps
}) => {
  const resolvedPresentation = presentation || (intent === 'primary' ? 'solid' : 'soft')
  const color = COLOR_BY_INTENT[intent] || COLOR_BY_INTENT.neutral
  const variant = resolvedPresentation === 'soft' ? 'outline' : undefined

  return (
    <CButton
      {...buttonProps}
      color={resolvedPresentation === 'ghost' ? 'link' : color}
      variant={variant}
      className={[
        'app-button',
        `app-button--${intent}`,
        `app-button--${resolvedPresentation}`,
        iconOnly ? 'app-button--icon-only' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </CButton>
  )
}

export default AppButton
