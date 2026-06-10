import React from 'react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const CARD_VARIANTS = {
  standard: {
    bodyClassName: 'd-flex align-items-center align-items-md-start gap-3',
    paddingClassName: 'p-3',
    descriptionClassName: 'mb-0 mt-1 text-body-secondary',
    hideDescriptionOnMobile: false,
    iconSize: 18,
    iconContainerSize: 40,
  },
  compact: {
    bodyClassName: 'd-flex align-items-center align-items-md-start gap-2 gap-md-3',
    paddingClassName: 'p-2 p-md-3',
    descriptionClassName: 'mb-0 mt-1 text-body-secondary',
    hideDescriptionOnMobile: true,
    iconSize: 18,
    iconContainerSize: 40,
  },
}

const IconOptionCard = ({
  title,
  description,
  icon: Icon,
  fallbackIcon: FallbackIcon = null,
  selected = false,
  disabled = false,
  onSelect,
  variant = 'standard',
  hideDescriptionOnMobile,
  showDescription = true,
  className = '',
  bodyClassName,
  paddingClassName,
  iconContainerClassName = '',
  titleClassName = 'fw-semibold',
  descriptionClassName,
  descriptionLineClamp = 2,
  iconSize,
  iconContainerSize,
  style,
  testId,
}) => {
  const variantPreset = CARD_VARIANTS[variant] || CARD_VARIANTS.standard
  const resolvedBodyClassName = bodyClassName || variantPreset.bodyClassName
  const resolvedPaddingClassName = paddingClassName || variantPreset.paddingClassName
  const resolvedDescriptionClassName = descriptionClassName || variantPreset.descriptionClassName
  const resolvedHideDescriptionOnMobile =
    typeof hideDescriptionOnMobile === 'boolean'
      ? hideDescriptionOnMobile
      : variantPreset.hideDescriptionOnMobile
  const resolvedIconSize = typeof iconSize === 'number' ? iconSize : variantPreset.iconSize
  const resolvedIconContainerSize =
    typeof iconContainerSize === 'number' ? iconContainerSize : variantPreset.iconContainerSize

  const isInteractive = typeof onSelect === 'function' && !disabled
  const IconToRender = Icon || FallbackIcon
  const shouldShowDescription = showDescription && Boolean(description)
  const resolvedDescriptionClass = buildClassName(
    resolvedDescriptionClassName,
    resolvedHideDescriptionOnMobile ? 'd-none d-md-block' : '',
  )

  return (
    <div
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      aria-pressed={selected}
      aria-disabled={!isInteractive}
      data-testid={testId}
      className={buildClassName(
        'rounded-3 border h-100 w-100',
        resolvedPaddingClassName,
        selected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle',
        className,
      )}
      style={{
        cursor: isInteractive ? 'pointer' : 'not-allowed',
        ...style,
      }}
      onClick={() => {
        if (!isInteractive) return
        onSelect()
      }}
      onKeyDown={(event) => {
        if (!isInteractive) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className={resolvedBodyClassName} style={{ minWidth: 0 }}>
        {IconToRender ? (
          <div
            className={buildClassName(
              'rounded-circle d-inline-flex align-items-center justify-content-center',
              selected ? 'bg-primary text-white' : 'bg-light text-primary',
              iconContainerClassName,
            )}
            style={{
              width: resolvedIconContainerSize,
              height: resolvedIconContainerSize,
              flex: `0 0 ${resolvedIconContainerSize}px`,
              lineHeight: 0,
            }}
          >
            <IconToRender size={resolvedIconSize} />
          </div>
        ) : null}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className={titleClassName}>{title}</div>
          {shouldShowDescription ? (
            <p
              className={resolvedDescriptionClass}
              title={description}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: descriptionLineClamp,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.35,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default IconOptionCard
