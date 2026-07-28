import React from 'react'
import { CBadge, CButton } from '@coreui/react'
import { FITNESS_PROTOCOL } from './constants'
import { getProficiencyCheckpointSummary } from './fitnessFormDomain'

const allCheckpointCompletion = (completed) =>
  Object.fromEntries(FITNESS_PROTOCOL.proficiency.checkpoints.map(({ id }) => [id, completed]))

const FitnessCheckpointControls = ({ participant, update, compact = false }) => {
  const summary = getProficiencyCheckpointSummary(participant.proficiency)
  const nextBulkState = !summary.allCompleted
  const bulkLabel = nextBulkState ? 'Mark all 6 complete' : 'Clear all'

  return (
    <div
      className={`fitness-checkpoints d-grid gap-2 ${compact ? 'fitness-checkpoints--compact' : ''}`}
      role="group"
      aria-label={`Proficiency checkpoints for ${participant.name}`}
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        {!compact ? <span className="small fw-semibold">Checkpoint completion</span> : null}
        <div className="d-flex align-items-center gap-2">
          <CBadge color={summary.allCompleted ? 'success' : 'secondary'}>
            {summary.completed}/{summary.total} CP
          </CBadge>
          <CButton
            type="button"
            color="link"
            size="sm"
            className="fitness-checkpoints__bulk p-0"
            aria-label={bulkLabel}
            onClick={() =>
              update({
                proficiency: { checkpointCompletion: allCheckpointCompletion(nextBulkState) },
              })
            }
          >
            {compact && nextBulkState ? 'All 6' : bulkLabel}
          </CButton>
        </div>
      </div>
      <div className={compact ? 'd-flex flex-wrap gap-1' : 'd-grid gap-2'}>
        {FITNESS_PROTOCOL.proficiency.checkpoints.map(({ id, label }) => {
          const completed = summary.completion[id]
          return (
            <CButton
              key={id}
              type="button"
              color={completed ? 'primary' : 'light'}
              size="sm"
              className={`fitness-checkpoints__item ${compact ? 'px-2' : 'd-flex align-items-center text-start gap-2'}`}
              aria-pressed={completed}
              aria-label={`${id.toUpperCase()} ${label} for ${participant.name}: ${completed ? 'completed' : 'not completed'}`}
              title={compact ? `${id.toUpperCase()}: ${label}` : undefined}
              onClick={() =>
                update({ proficiency: { checkpointCompletion: { [id]: !completed } } })
              }
            >
              <span className="fw-semibold">{id.toUpperCase()}</span>
              {!compact ? <span>{label}</span> : null}
            </CButton>
          )
        })}
      </div>
    </div>
  )
}

export default FitnessCheckpointControls
