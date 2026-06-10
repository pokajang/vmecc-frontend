import { useCallback, useMemo, useState } from 'react'
import useTableRows from 'src/hooks/useTableRows'
import { filterOvertimeRecords } from '../../leave-management/utils'
import {
  buildOptionsFromUnique,
  filterAssignmentRows,
  filterClaimRows,
  filterSalaryRows,
  toTypeLabel,
} from '../utils'

const useClaimsAdminData = ({ claimRows = [], adminOvertimeRows = [], assignmentRows = [] }) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('submittedAt:desc')

  const [salarySearch, setSalarySearch] = useState('')
  const [salaryStatusFilter, setSalaryStatusFilter] = useState('All')
  const [salaryPeriod, setSalaryPeriod] = useState('all')
  const [salarySort, setSalarySort] = useState('submittedAt:desc')

  const [overtimeSearch, setOvertimeSearch] = useState('')
  const [overtimeStatusFilter, setOvertimeStatusFilter] = useState('All')
  const [overtimePeriod, setOvertimePeriod] = useState('all')
  const [overtimeSort, setOvertimeSort] = useState('appliedAt:desc')

  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentTeamFilter, setAssignmentTeamFilter] = useState('All')
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('All')
  const [assignmentSort, setAssignmentSort] = useState('updatedAt:desc')

  const nonSalaryClaimRows = useMemo(
    () => claimRows.filter((row) => String(row?.type || '').trim() !== 'salary'),
    [claimRows],
  )
  const effectiveClaimTypeFilter = typeFilter === 'salary' ? 'All' : typeFilter

  const filteredClaimRows = useMemo(
    () =>
      filterClaimRows(nonSalaryClaimRows, {
        search,
        statusFilter,
        typeFilter: effectiveClaimTypeFilter,
        period,
        sort,
      }),
    [effectiveClaimTypeFilter, nonSalaryClaimRows, period, search, sort, statusFilter],
  )

  const filteredSalaryRows = useMemo(
    () =>
      filterSalaryRows(claimRows, {
        search: salarySearch,
        statusFilter: salaryStatusFilter,
        period: salaryPeriod,
        sort: salarySort,
      }),
    [claimRows, salaryPeriod, salarySearch, salarySort, salaryStatusFilter],
  )

  const filteredOvertimeRows = useMemo(
    () =>
      filterOvertimeRecords(adminOvertimeRows, {
        search: overtimeSearch,
        statusFilter: overtimeStatusFilter,
        period: overtimePeriod,
        sort: overtimeSort,
      }),
    [adminOvertimeRows, overtimePeriod, overtimeSearch, overtimeSort, overtimeStatusFilter],
  )

  const filteredAssignmentRows = useMemo(
    () =>
      filterAssignmentRows(assignmentRows, {
        search: assignmentSearch,
        teamFilter: assignmentTeamFilter,
        statusFilter: assignmentStatusFilter,
        sort: assignmentSort,
      }),
    [
      assignmentRows,
      assignmentSearch,
      assignmentSort,
      assignmentStatusFilter,
      assignmentTeamFilter,
    ],
  )

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredClaimRows)
  const {
    rowsToShow: salaryRowsToShow,
    setRowsToShow: setSalaryRowsToShow,
    visibleRows: visibleSalaryRows,
  } = useTableRows(filteredSalaryRows)
  const {
    rowsToShow: overtimeRowsToShow,
    setRowsToShow: setOvertimeRowsToShow,
    visibleRows: visibleOvertimeRows,
  } = useTableRows(filteredOvertimeRows)
  const {
    rowsToShow: assignmentRowsToShow,
    setRowsToShow: setAssignmentRowsToShow,
    visibleRows: visibleAssignmentRows,
  } = useTableRows(filteredAssignmentRows)

  const claimTypeOptions = useMemo(
    () =>
      buildOptionsFromUnique(nonSalaryClaimRows, 'type', 'All claim types', (value) =>
        toTypeLabel(value),
      ),
    [nonSalaryClaimRows],
  )
  const claimStatusOptions = useMemo(
    () => buildOptionsFromUnique(nonSalaryClaimRows, 'status', 'All status'),
    [nonSalaryClaimRows],
  )
  const salaryStatusOptions = useMemo(
    () =>
      buildOptionsFromUnique(
        claimRows.filter((row) => row.type === 'salary'),
        'status',
        'All status',
      ),
    [claimRows],
  )
  const overtimeStatusOptions = useMemo(
    () => buildOptionsFromUnique(adminOvertimeRows, 'status', 'All status'),
    [adminOvertimeRows],
  )
  const assignmentTeamOptions = useMemo(
    () => buildOptionsFromUnique(assignmentRows, 'team', 'All teams'),
    [assignmentRows],
  )
  const assignmentStatusOptions = useMemo(
    () => [
      { value: 'All', label: 'All status' },
      { value: 'Active', label: 'Active' },
      { value: 'Scheduled', label: 'Scheduled' },
      { value: 'Superseded', label: 'Superseded' },
      { value: 'Draft', label: 'Draft' },
    ],
    [],
  )

  const clearClaimFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setTypeFilter('All')
    setPeriod('all')
    setSort('submittedAt:desc')
  }, [])

  const clearSalaryFilters = useCallback(() => {
    setSalarySearch('')
    setSalaryStatusFilter('All')
    setSalaryPeriod('all')
    setSalarySort('submittedAt:desc')
  }, [])

  const clearOvertimeFilters = useCallback(() => {
    setOvertimeSearch('')
    setOvertimeStatusFilter('All')
    setOvertimePeriod('all')
    setOvertimeSort('appliedAt:desc')
  }, [])

  const clearAssignmentFilters = useCallback(() => {
    setAssignmentSearch('')
    setAssignmentTeamFilter('All')
    setAssignmentStatusFilter('All')
    setAssignmentSort('updatedAt:desc')
  }, [])

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    period,
    setPeriod,
    sort,
    setSort,
    salarySearch,
    setSalarySearch,
    salaryStatusFilter,
    setSalaryStatusFilter,
    salaryPeriod,
    setSalaryPeriod,
    salarySort,
    setSalarySort,
    overtimeSearch,
    setOvertimeSearch,
    overtimeStatusFilter,
    setOvertimeStatusFilter,
    overtimePeriod,
    setOvertimePeriod,
    overtimeSort,
    setOvertimeSort,
    assignmentSearch,
    setAssignmentSearch,
    assignmentTeamFilter,
    setAssignmentTeamFilter,
    assignmentStatusFilter,
    setAssignmentStatusFilter,
    assignmentSort,
    setAssignmentSort,
    filteredClaimRows,
    filteredSalaryRows,
    filteredOvertimeRows,
    filteredAssignmentRows,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    salaryRowsToShow,
    setSalaryRowsToShow,
    visibleSalaryRows,
    overtimeRowsToShow,
    setOvertimeRowsToShow,
    visibleOvertimeRows,
    assignmentRowsToShow,
    setAssignmentRowsToShow,
    visibleAssignmentRows,
    claimTypeOptions,
    claimStatusOptions,
    salaryStatusOptions,
    overtimeStatusOptions,
    assignmentTeamOptions,
    assignmentStatusOptions,
    clearClaimFilters,
    clearSalaryFilters,
    clearOvertimeFilters,
    clearAssignmentFilters,
  }
}

export default useClaimsAdminData
