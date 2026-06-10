import { useCallback, useMemo, useState } from 'react'

const useBulkUserActions = ({
  users,
  visibleUsers,
  bulkUpdateStatus,
  bulkDeleteUsers,
  bulkRestoreUsers,
  bulkDeleteUsersPermanently,
}) => {
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedBulkAction, setSelectedBulkAction] = useState('')
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id)),
    [selectedIds, users],
  )

  const bulkActionTargets = useMemo(
    () => ({
      activate: selectedUsers.filter((u) => !u.deleted_at && (u.status || '') !== 'Active'),
      deactivate: selectedUsers.filter((u) => !u.deleted_at && (u.status || '') !== 'Inactive'),
      delete: selectedUsers.filter((u) => !u.deleted_at),
      restore: selectedUsers.filter((u) => Boolean(u.deleted_at)),
      permanent_delete: selectedUsers.filter((u) => Boolean(u.deleted_at)),
    }),
    [selectedUsers],
  )

  const bulkActionOptions = useMemo(() => {
    const options = []
    if (bulkActionTargets.activate.length > 0)
      options.push({ value: 'activate', label: 'Activate' })
    if (bulkActionTargets.deactivate.length > 0) {
      options.push({ value: 'deactivate', label: 'Deactivate' })
    }
    if (bulkActionTargets.delete.length > 0) options.push({ value: 'delete', label: 'Delete' })
    if (bulkActionTargets.restore.length > 0) options.push({ value: 'restore', label: 'Restore' })
    if (bulkActionTargets.permanent_delete.length > 0) {
      options.push({ value: 'permanent_delete', label: 'Delete permanently' })
    }
    return options
  }, [bulkActionTargets])

  const resolvedBulkAction = bulkActionOptions.some((option) => option.value === selectedBulkAction)
    ? selectedBulkAction
    : bulkActionOptions[0]?.value || ''

  const selectedBulkTargetCount = resolvedBulkAction
    ? (bulkActionTargets[resolvedBulkAction] || []).length
    : 0

  const bulkConfirmConfig = useMemo(() => {
    if (resolvedBulkAction === 'activate') {
      return {
        title: 'Activate Users',
        message: `Activate ${selectedBulkTargetCount} selected user(s)?`,
        confirmLabel: 'Activate',
        confirmColor: 'success',
      }
    }
    if (resolvedBulkAction === 'deactivate') {
      return {
        title: 'Deactivate Users',
        message: `Deactivate ${selectedBulkTargetCount} selected user(s)?`,
        confirmLabel: 'Deactivate',
        confirmColor: 'danger',
      }
    }
    if (resolvedBulkAction === 'delete') {
      return {
        title: 'Delete Users',
        message: `Delete ${selectedBulkTargetCount} selected user(s)? You can restore them later.`,
        confirmLabel: 'Delete',
        confirmColor: 'danger',
      }
    }
    if (resolvedBulkAction === 'restore') {
      return {
        title: 'Restore Users',
        message: `Restore ${selectedBulkTargetCount} selected user(s)?`,
        confirmLabel: 'Restore',
        confirmColor: 'success',
      }
    }
    if (resolvedBulkAction === 'permanent_delete') {
      return {
        title: 'Delete Users Permanently',
        message: `Permanently delete ${selectedBulkTargetCount} selected user(s)? This cannot be undone.`,
        confirmLabel: 'Delete permanently',
        confirmColor: 'danger',
      }
    }
    return {
      title: 'Confirm Bulk Action',
      message: 'Are you sure you want to continue?',
      confirmLabel: 'Confirm',
      confirmColor: 'primary',
    }
  }, [resolvedBulkAction, selectedBulkTargetCount])

  const toggleSelect = useCallback((user) => {
    if (!user) return
    setSelectedIds((prev) =>
      prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id],
    )
  }, [])

  const toggleSelectAll = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedIds((prev) => prev.filter((id) => !visibleUsers.some((u) => u.id === id)))
        return
      }
      const next = new Set(selectedIds)
      visibleUsers.forEach((u) => next.add(u.id))
      setSelectedIds(Array.from(next))
    },
    [selectedIds, visibleUsers],
  )

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const openBulkConfirm = useCallback(() => {
    if (!resolvedBulkAction || selectedBulkTargetCount === 0) return
    setConfirmBulkOpen(true)
  }, [resolvedBulkAction, selectedBulkTargetCount])

  const closeBulkConfirm = useCallback(() => {
    setConfirmBulkOpen(false)
  }, [])

  const handleConfirmBulkAction = useCallback(async () => {
    const targetIds = (bulkActionTargets[resolvedBulkAction] || []).map((user) => user.id)
    if (targetIds.length === 0) {
      setConfirmBulkOpen(false)
      return
    }
    if (resolvedBulkAction === 'activate') await bulkUpdateStatus(targetIds, 'Active')
    else if (resolvedBulkAction === 'deactivate') await bulkUpdateStatus(targetIds, 'Inactive')
    else if (resolvedBulkAction === 'delete') await bulkDeleteUsers(targetIds)
    else if (resolvedBulkAction === 'restore') await bulkRestoreUsers(targetIds)
    else if (resolvedBulkAction === 'permanent_delete') await bulkDeleteUsersPermanently(targetIds)

    clearSelection()
    setConfirmBulkOpen(false)
  }, [
    bulkActionTargets,
    bulkUpdateStatus,
    bulkDeleteUsers,
    bulkRestoreUsers,
    bulkDeleteUsersPermanently,
    clearSelection,
    resolvedBulkAction,
  ])

  return {
    selectedIds,
    setSelectedIds,
    selectedCount: selectedIds.length,
    selectedBulkAction: resolvedBulkAction,
    setSelectedBulkAction,
    confirmBulkOpen,
    selectedBulkTargetCount,
    bulkConfirmConfig,
    bulkActionOptions,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    openBulkConfirm,
    closeBulkConfirm,
    handleConfirmBulkAction,
  }
}

export default useBulkUserActions
