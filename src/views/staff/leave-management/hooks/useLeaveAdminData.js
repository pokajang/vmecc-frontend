import { useCallback, useState } from 'react'

const getCurrentYearValue = () => String(new Date().getFullYear())

const useLeaveAdminData = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('appliedAt:desc')
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [groupByMonth, setGroupByMonth] = useState(true)

  const [overtimeSearch, setOvertimeSearch] = useState('')
  const [overtimeStatusFilter, setOvertimeStatusFilter] = useState('All')
  const [overtimePeriod, setOvertimePeriod] = useState('all')
  const [overtimeSort, setOvertimeSort] = useState('appliedAt:desc')

  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState('All')
  const [assignmentTeamFilter, setAssignmentTeamFilter] = useState('All')
  const [assignmentSort, setAssignmentSort] = useState('employee:asc')
  const [holidaySearch, setHolidaySearch] = useState('')
  const [holidayScopeFilter, setHolidayScopeFilter] = useState('All')
  const [holidayStateFilter, setHolidayStateFilter] = useState('All')
  const [holidayYearFilter, setHolidayYearFilter] = useState(getCurrentYearValue)
  const [holidaySort, setHolidaySort] = useState('date:asc')

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setTypeFilter('All')
    setPeriod('all')
    setSort('appliedAt:desc')
    setIsMobileFiltersOpen(false)
  }, [])

  const clearOvertimeFilters = useCallback(() => {
    setOvertimeSearch('')
    setOvertimeStatusFilter('All')
    setOvertimePeriod('all')
    setOvertimeSort('appliedAt:desc')
  }, [])

  const clearAssignmentFilters = useCallback(() => {
    setAssignmentSearch('')
    setAssignmentTypeFilter('All')
    setAssignmentTeamFilter('All')
    setAssignmentSort('employee:asc')
  }, [])

  const clearHolidayFilters = useCallback(() => {
    setHolidaySearch('')
    setHolidayScopeFilter('All')
    setHolidayStateFilter('All')
    setHolidayYearFilter(getCurrentYearValue())
    setHolidaySort('date:asc')
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
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    groupByMonth,
    setGroupByMonth,
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
    assignmentTypeFilter,
    setAssignmentTypeFilter,
    assignmentTeamFilter,
    setAssignmentTeamFilter,
    assignmentSort,
    setAssignmentSort,
    holidaySearch,
    setHolidaySearch,
    holidayScopeFilter,
    setHolidayScopeFilter,
    holidayStateFilter,
    setHolidayStateFilter,
    holidayYearFilter,
    setHolidayYearFilter,
    holidaySort,
    setHolidaySort,
    clearFilters,
    clearOvertimeFilters,
    clearAssignmentFilters,
    clearHolidayFilters,
  }
}

export default useLeaveAdminData
