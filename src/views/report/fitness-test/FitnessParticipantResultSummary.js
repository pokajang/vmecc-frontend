import React from 'react'
import { formatFitnessDuration, getProficiencyCheckpointSummary } from './fitnessFormDomain'

const displayCount = (value) =>
  value === '' || value === null || value === undefined ? '--' : value

const FitnessParticipantResultSummary = ({ assessment, mode }) => {
  const checkpointSummary = getProficiencyCheckpointSummary(assessment)
  const items =
    mode === 'fitness'
      ? [
          ['Sit-ups', displayCount(assessment.sitUps)],
          ['Jumping jacks', displayCount(assessment.jumpingJacks)],
          ['Push-ups', displayCount(assessment.pushUps)],
        ]
      : [
          ['Checkpoints', `${checkpointSummary.completed}/${checkpointSummary.total}`],
          ['Time', formatFitnessDuration(assessment.durationSeconds)],
        ]

  return (
    <dl className="fitness-participant-result-summary mb-0">
      {items.map(([label, value]) => (
        <div key={label} className="fitness-participant-result-summary__item">
          <dt>{label}</dt>
          <dd className="mb-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default FitnessParticipantResultSummary
