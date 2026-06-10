import { useMemo, useState } from 'react'

export const DEFAULT_ROWS_TO_SHOW = 5
export const ALL_ROWS_SENTINEL = 'all'

const normalizeItems = (items) => (Array.isArray(items) ? items : [])

const useTableRows = (items, defaultRows = DEFAULT_ROWS_TO_SHOW) => {
  const [rowsToShow, setRowsToShow] = useState(defaultRows)
  const safeItems = normalizeItems(items)

  const visibleRows = useMemo(() => {
    if (rowsToShow === ALL_ROWS_SENTINEL || rowsToShow >= safeItems.length) return safeItems
    return safeItems.slice(0, rowsToShow)
  }, [rowsToShow, safeItems])

  return {
    rowsToShow,
    setRowsToShow,
    visibleRows,
  }
}

export default useTableRows
