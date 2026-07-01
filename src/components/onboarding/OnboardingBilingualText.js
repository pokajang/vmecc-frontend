import React from 'react'

const isNonEmptyString = (value) => String(value || '').trim().length > 0

export const isBilingualCopy = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.prototype.hasOwnProperty.call(value, 'en') ||
    Object.prototype.hasOwnProperty.call(value, 'bm'))

export const getOnboardingCopyText = (value, locale = 'en') => {
  if (!isBilingualCopy(value)) {
    return String(value || '').trim()
  }

  const primary = String(value?.[locale] || '').trim()
  const fallbackLocale = locale === 'en' ? 'bm' : 'en'
  const fallback = String(value?.[fallbackLocale] || '').trim()

  return primary || fallback
}

export const getOnboardingCopyA11yLabel = (value, locale = 'en') =>
  getOnboardingCopyText(value, locale)

export const formatOnboardingCopyInline = (value, locale = 'en') =>
  getOnboardingCopyText(value, locale)

const OnboardingBilingualText = ({
  as: Component = 'div',
  value,
  locale = 'en',
  className = '',
  itemClassName = '',
}) => {
  const text = getOnboardingCopyText(value, locale)

  return (
    <Component className={className}>
      {itemClassName && isNonEmptyString(text) ? (
        <span className={itemClassName}>{text}</span>
      ) : (
        text
      )}
    </Component>
  )
}

export default OnboardingBilingualText
