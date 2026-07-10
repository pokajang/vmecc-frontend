import React from 'react'
import { CButton } from '@coreui/react'

import { exportInspectionRecordsCsv } from './inspectionChecklistSummary'

const InspectionChecklistSummaryPanel = ({
  summary,
  isLoading = false,
  filteredRecords = [],
  checklistFilter = 'All',
  setChecklistFilter,
  setHasChecklistFilter,
}) => (
  <div className="border rounded-3 p-3 mb-3 bg-body">
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <div>
        <div className="fw-semibold">Checklist Summary</div>
        <div className="small text-body-secondary">
          {isLoading
            ? 'Loading checklist totals...'
            : `${summary.withChecklist || 0} with checklist, ${summary.withoutChecklist || 0} without checklist`}
        </div>
      </div>
      <div className="d-flex flex-wrap gap-2">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => exportInspectionRecordsCsv(filteredRecords)}
        >
          Export CSV
        </CButton>
        {summary.withoutChecklist > 0 ? (
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setHasChecklistFilter('no')}
          >
            No checklist ({summary.withoutChecklist})
          </CButton>
        ) : null}
      </div>
    </div>
    {summary.items?.length ? (
      <div className="d-flex flex-wrap gap-2">
        {summary.items.slice(0, 8).map((item) => (
          <CButton
            key={item.id || item.label}
            color={
              checklistFilter === item.id || checklistFilter === item.label
                ? 'primary'
                : 'secondary'
            }
            variant={
              checklistFilter === item.id || checklistFilter === item.label ? undefined : 'outline'
            }
            size="sm"
            onClick={() => setChecklistFilter(item.id || item.label)}
          >
            {item.label} ({item.count})
          </CButton>
        ))}
      </div>
    ) : (
      <div className="small text-body-secondary">No selected checklist items in this view.</div>
    )}
  </div>
)

export default InspectionChecklistSummaryPanel
