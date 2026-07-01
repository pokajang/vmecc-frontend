import React from 'react'

const OPTIONS = [
  { value: 'mine', label: 'Mine' },
  { value: 'all', label: 'All' },
]

const RecordScopeSegmentedControl = ({ value = 'mine', onChange, className = '', ...rest }) => (
  <div
    {...rest}
    className={`workflow-scope-segmented d-inline-flex align-items-center ${className}`.trim()}
    role="group"
    aria-label="Record scope"
  >
    {OPTIONS.map((option) => {
      const isActive = value === option.value
      return (
        <button
          key={option.value}
          type="button"
          className="workflow-scope-segment"
          aria-pressed={isActive}
          data-active={isActive ? 'true' : 'false'}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

export default RecordScopeSegmentedControl
