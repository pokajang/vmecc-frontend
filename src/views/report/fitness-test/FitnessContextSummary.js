import React from 'react'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import { FITNESS_REPORT_OPTION } from './constants'
import { flattenFitnessParticipants } from './fitnessFormDomain'

const formatReportingMonth = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return '--'

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)))
}

export const buildFitnessContextSummaryItems = (form = {}) => {
  const shifts = (Array.isArray(form.shiftGroups) ? form.shiftGroups : []).filter(
    (group) => group?.participants?.length,
  )

  return [
    {
      label: 'Type',
      value: FITNESS_REPORT_OPTION.title,
    },
    {
      label: 'Reporting Period',
      value: formatReportingMonth(form.reportingMonth),
    },
    {
      label: 'Personnel',
      value: `${flattenFitnessParticipants(form).length} selected`,
    },
    {
      label: 'Shift Groups',
      value: shifts.length
        ? shifts
            .map((group) => group.shift)
            .filter(Boolean)
            .join(', ')
        : '--',
    },
  ]
}

const FitnessContextSummary = ({ form }) => (
  <WorkflowSummaryList
    title="Test Context"
    items={buildFitnessContextSummaryItems(form)}
    variant="context"
    className="d-md-none mb-4"
  />
)

export default FitnessContextSummary
