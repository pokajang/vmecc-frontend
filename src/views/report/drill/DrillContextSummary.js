import React from 'react'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import { formatDateTime } from '../utils'

const text = (value) => String(value || '').trim()

export const buildDrillContextSummaryItems = (form = {}, { includeTitle = false } = {}) => {
  const categories = (Array.isArray(form.exerciseCategories) ? form.exerciseCategories : [])
    .map(text)
    .filter(Boolean)
  const selectedPersonnel = (
    Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []
  ).filter((row) => row?.present)
  const team = text(form.respondingTeamName)
  const shift = text(form.respondingTeamShift)
  const personnelMeta = [shift, `${selectedPersonnel.length} selected`].filter(Boolean).join(' · ')

  const items = [
    {
      label: 'Type',
      value: text(form.incidentType) || '--',
      meta: categories.join(', '),
    },
    {
      label: 'Environment',
      value: text(form.weather) || '--',
    },
    {
      label: 'Location',
      value: text(form.location) || '--',
    },
    {
      label: 'Date & Time',
      value: formatDateTime(text(form.reportDate), text(form.reportTime)),
    },
    {
      label: 'Exercise Personnel',
      value: team || `${selectedPersonnel.length} selected`,
      meta: team ? personnelMeta : shift,
    },
  ]

  if (includeTitle) {
    items.push({
      label: 'Exercise Title',
      value: text(form.exerciseTitle) || text(form.details) || '--',
    })
  }

  return items
}

const DrillContextSummary = ({ form, includeTitle = false }) => (
  <WorkflowSummaryList
    title="Drill Context"
    items={buildDrillContextSummaryItems(form, { includeTitle })}
    variant="context"
    className="d-md-none"
  />
)

export default DrillContextSummary
