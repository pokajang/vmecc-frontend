import { useEffect, useMemo, useState } from 'react'
import { getPeriodOptions } from 'src/components/TablePeriodSelect'

const getFilterDefaultValue = (filter) =>
  Object.prototype.hasOwnProperty.call(filter, 'defaultValue')
    ? filter.defaultValue
    : filter.options?.[0]?.value

const useTableFilters = ({
  searchValue = '',
  onSearchChange = () => {},
  filters = [],
  periodValue = 'all',
  onPeriodChange = () => {},
  periodOptions = null,
  showPeriod = true,
  periodLabel = 'Period',
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue)

  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [localSearch, onSearchChange, searchValue])

  const resolvedPeriodOptions = useMemo(() => periodOptions || getPeriodOptions(), [periodOptions])

  const isStructuredFilterActive = useMemo(() => {
    if (showPeriod && periodValue && periodValue !== 'all') return true
    return filters.some((filter) => {
      const defaultValue = getFilterDefaultValue(filter)
      return filter.value !== undefined && filter.value !== defaultValue
    })
  }, [showPeriod, periodValue, filters])

  const isAnyFilterActive = useMemo(() => {
    if (localSearch.trim()) return true
    return isStructuredFilterActive
  }, [localSearch, isStructuredFilterActive])

  const activeFilterItems = useMemo(() => {
    const items = []
    if (localSearch.trim()) {
      items.push({
        key: 'search',
        label: 'Search',
        value: localSearch.trim(),
        onClear: () => {
          setLocalSearch('')
          onSearchChange('')
        },
      })
    }
    if (showPeriod && periodValue && periodValue !== 'all') {
      const label =
        resolvedPeriodOptions.find((option) => String(option.value) === String(periodValue))
          ?.label || periodValue
      items.push({
        key: 'period',
        label: periodLabel,
        value: label,
        onClear: () => onPeriodChange('all'),
      })
    }
    filters.forEach((filter) => {
      const defaultValue = getFilterDefaultValue(filter)
      if (filter.value === undefined || filter.value === defaultValue) return
      const label =
        filter.options?.find((option) => String(option.value) === String(filter.value))?.label ||
        filter.value
      items.push({
        key: filter.key,
        label: filter.label || 'Filter',
        value: label,
        onClear:
          typeof filter.onClear === 'function'
            ? filter.onClear
            : defaultValue !== undefined
              ? () => filter.onChange(defaultValue)
              : null,
      })
    })
    return items
  }, [
    filters,
    localSearch,
    onPeriodChange,
    onSearchChange,
    periodLabel,
    periodValue,
    resolvedPeriodOptions,
    showPeriod,
  ])

  return {
    localSearch,
    setLocalSearch,
    resolvedPeriodOptions,
    activeFilterItems,
    isStructuredFilterActive,
    isAnyFilterActive,
  }
}

export { getFilterDefaultValue }
export default useTableFilters
