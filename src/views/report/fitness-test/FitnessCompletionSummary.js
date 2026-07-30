import React from 'react'

const FitnessCompletionSummary = ({ summary, onReviewIncomplete }) => {
  const items = [
    ['Personnel', summary.participants],
    ['Passed assessments', summary.passedAssessments],
    ['Failed assessments', summary.failedAssessments],
    ['Incomplete', summary.incompleteAssessments],
  ]

  return (
    <dl className="fitness-completion-summary mb-0">
      {items.map(([label, value]) => (
        <div key={label} className="fitness-completion-summary__item">
          <dt className="fitness-completion-summary__label">{label}</dt>
          <dd className="fitness-completion-summary__value mb-0">
            {label === 'Incomplete' && value > 0 && onReviewIncomplete ? (
              <button
                type="button"
                className="btn btn-link p-0 fw-semibold"
                onClick={onReviewIncomplete}
              >
                {value} · Review
              </button>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default FitnessCompletionSummary
