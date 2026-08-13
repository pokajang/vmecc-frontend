import React from 'react'

import TableFilters from 'src/components/TableFilters'

const InspectionRecordsFilters = ({
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  typeFilter,
  setTypeFilter,
  typeOptions,
  statusFilter,
  setStatusFilter,
  statusOptions,
  hasChecklistFilter,
  setHasChecklistFilter,
  checklistFilter,
  setChecklistFilter,
  checklistOptions,
  sortOptions,
  clearFilters,
}) => (
  <div data-testid="inspection-filters">
    <TableFilters
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search records"
      periodValue={period}
      onPeriodChange={setPeriod}
      filters={[
        { key: 'sort', label: 'Sort', value: sort, onChange: setSort, options: sortOptions },
        {
          key: 'type',
          label: 'Type',
          value: typeFilter,
          onChange: setTypeFilter,
          options: typeOptions,
        },
        {
          key: 'status',
          label: 'Status',
          value: statusFilter,
          onChange: setStatusFilter,
          options: statusOptions,
        },
        {
          key: 'hasChecklist',
          label: 'Has checklist',
          value: hasChecklistFilter,
          onChange: setHasChecklistFilter,
          options: [
            { value: 'All', label: 'All' },
            { value: 'yes', label: 'Has checklist' },
            { value: 'no', label: 'No checklist' },
          ],
        },
        {
          key: 'checklist',
          label: 'Checklist item',
          value: checklistFilter,
          onChange: setChecklistFilter,
          options: checklistOptions,
        },
      ]}
      onClear={clearFilters}
      rowClassName="inspection-records-filter-row inspection-report-records-filter-row align-items-md-end"
      searchColMd={3}
      periodColMd={2}
      filterColMd={2}
      clearColMd="auto"
      showDesktopLabels
      labelClassName="text-muted"
    />
  </div>
)

export default InspectionRecordsFilters
