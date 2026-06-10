import React from 'react'

const normalizeAction = (value) => (value === 'reject' ? 'reject' : 'approve')

const resolveDefaultApproveLabel = () => 'Approve'

const useBulkWorkflowSelection = ({
  rows = [],
  getRowKey,
  canBulkActOnRow,
  getApproveActionLabel = resolveDefaultApproveLabel,
  onBulkWorkflowAction,
}) => {
  const safeRows = React.useMemo(() => (Array.isArray(rows) ? rows : []), [rows])
  const [selectedKeys, setSelectedKeys] = React.useState(() => new Set())
  const [bulkActionState, setBulkActionState] = React.useState({
    visible: false,
    action: 'approve',
  })
  const [bulkRemarks, setBulkRemarks] = React.useState('')
  const [bulkDeclarationChecked, setBulkDeclarationChecked] = React.useState(false)
  const [bulkDeclarationError, setBulkDeclarationError] = React.useState('')
  const [bulkRejectError, setBulkRejectError] = React.useState('')

  const selectedRows = safeRows.filter((row) => {
    const key = String(getRowKey?.(row) || '').trim()
    return key && selectedKeys.has(key) && Boolean(canBulkActOnRow?.(row))
  })
  const selectedVisibleCount = selectedRows.length
  const selectedApproveActionLabel = (() => {
    const labels = Array.from(
      new Set(
        selectedRows
          .map((row) => String(getApproveActionLabel?.(row) || 'Approve').trim())
          .filter(Boolean),
      ),
    )
    if (labels.length === 1) return labels[0]
    return 'Process'
  })()

  React.useEffect(() => {
    setSelectedKeys((prev) => {
      let changed = false
      const next = new Set()
      prev.forEach((key) => {
        const stillVisible = safeRows.some((row) => {
          const rowKey = String(getRowKey?.(row) || '').trim()
          return rowKey === key && Boolean(canBulkActOnRow?.(row))
        })
        if (stillVisible) {
          next.add(key)
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [canBulkActOnRow, getRowKey, safeRows])

  const clearSelection = () => {
    setSelectedKeys(new Set())
  }

  const isSelectedKey = (key) => selectedKeys.has(String(key || '').trim())

  const toggleGroupSelection = (keys = [], allSelected = false) => {
    const normalized = (Array.isArray(keys) ? keys : [])
      .map((key) => String(key || '').trim())
      .filter(Boolean)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        normalized.forEach((key) => next.delete(key))
      } else {
        normalized.forEach((key) => next.add(key))
      }
      return next
    })
  }

  const openBulkModal = (action) => {
    setBulkActionState({
      visible: true,
      action: normalizeAction(action),
    })
    setBulkRemarks('')
    setBulkDeclarationChecked(false)
    setBulkDeclarationError('')
    setBulkRejectError('')
  }

  const closeBulkModal = () => {
    setBulkActionState({ visible: false, action: 'approve' })
    setBulkRemarks('')
    setBulkDeclarationChecked(false)
    setBulkDeclarationError('')
    setBulkRejectError('')
  }

  const submitBulkModal = async () => {
    if (typeof onBulkWorkflowAction !== 'function') return { processed: 0, succeeded: 0, failed: 0 }
    if (bulkActionState.action === 'reject' && !String(bulkRemarks || '').trim()) {
      setBulkRejectError('Please provide remarks when rejecting.')
      return { processed: 0, succeeded: 0, failed: 0 }
    }
    if (bulkActionState.action !== 'reject' && !bulkDeclarationChecked) {
      setBulkDeclarationError('Please confirm responsibility before proceeding.')
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    const result = await onBulkWorkflowAction({
      action: bulkActionState.action,
      rows: selectedRows,
      remarks: bulkRemarks,
      declarationChecked: bulkDeclarationChecked,
    })

    if ((result?.succeeded || 0) > 0) {
      clearSelection()
      closeBulkModal()
    }
    return result
  }

  return {
    selectedKeys,
    selectedRows,
    selectedVisibleCount,
    selectedApproveActionLabel,
    bulkActionState,
    bulkRemarks,
    bulkDeclarationChecked,
    bulkDeclarationError,
    bulkRejectError,
    setBulkRemarks,
    setBulkDeclarationChecked,
    setBulkDeclarationError,
    setBulkRejectError,
    isSelectedKey,
    clearSelection,
    toggleGroupSelection,
    openBulkModal,
    closeBulkModal,
    submitBulkModal,
  }
}

export default useBulkWorkflowSelection
