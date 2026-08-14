import React from 'react'

const STEPS = [
  ['period', 'Reporting Period'],
  ['personnel', 'Personnel'],
  ['results', 'Test Results'],
  ['signoff', 'Signoff'],
]

const FitnessStageHeader = ({ activeStep }) => {
  const activeIndex = Math.max(
    0,
    STEPS.findIndex(([key]) => key === activeStep),
  )
  return (
    <nav className="mb-4" aria-label="Fitness report progress">
      <div className="d-flex justify-content-end small text-body-secondary mb-2">
        Step {activeIndex + 1} of {STEPS.length} · {STEPS[activeIndex][1]}
      </div>
      <div
        className="progress mb-2"
        style={{ height: 5 }}
        role="progressbar"
        aria-label="Fitness report completion"
        aria-valuemin="1"
        aria-valuemax={STEPS.length}
        aria-valuenow={activeIndex + 1}
      >
        <div
          className="progress-bar"
          style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="visually-hidden">
        {STEPS.map(([key, label], index) => (
          <li
            key={key}
            aria-current={index === activeIndex ? 'step' : undefined}
            className={`fitness-stage-step ${
              index === activeIndex ? 'text-primary fw-semibold' : 'text-body-secondary'
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default FitnessStageHeader
