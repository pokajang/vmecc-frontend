import React from 'react'
import { CButton } from '@coreui/react'

const options = [
  { value: 'en', label: 'English' },
  { value: 'bm', label: 'BM' },
]

const OnboardingLanguageSelector = ({ locale, onChange, className = '' }) => (
  <div
    className={`onboarding-language-selector${className ? ` ${className}` : ''}`}
    role="group"
    aria-label="Tutorial language"
  >
    {options.map((option) => (
      <CButton
        key={option.value}
        type="button"
        color={locale === option.value ? 'primary' : 'secondary'}
        variant={locale === option.value ? undefined : 'outline'}
        size="sm"
        aria-pressed={locale === option.value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </CButton>
    ))}
  </div>
)

export default OnboardingLanguageSelector
