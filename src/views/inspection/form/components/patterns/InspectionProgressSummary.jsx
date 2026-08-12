import React from 'react'
import { CircleAlert } from 'lucide-react'
import { formatInspectionProgressSummary } from './inspectionProgressSummary'

const InspectionProgressSummary = ({
  checkedCount,
  completedCount,
  inspectedCount,
  totalCount,
  issueCount,
  defectCount,
  className = '',
}) => {
  const summary = formatInspectionProgressSummary({
    checkedCount,
    completedCount,
    inspectedCount,
    totalCount,
    issueCount,
    defectCount,
  })

  return (
    <span
      className={`inspection-progress-summary d-inline-flex flex-wrap align-items-center gap-1 ${className}`.trim()}
      aria-label={summary.text}
    >
      <span>{summary.progressText}</span>
      {summary.issueText ? (
        <>
          <span aria-hidden="true">•</span>
          <span className="inspection-progress-summary__issues d-inline-flex align-items-center gap-1">
            <CircleAlert size={13} aria-hidden="true" />
            <span>{summary.issueText}</span>
          </span>
        </>
      ) : null}
    </span>
  )
}

export default InspectionProgressSummary
