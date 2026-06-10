import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useTableRows from 'src/hooks/useTableRows'
import {
  flushPayrollDraftRetryQueue,
  loadLocalPayrollAutosaveDrafts,
  loadMyPayrollClaimDraftsApiFirst,
  loadMyPayrollClaimsApiFirst,
  loadMyPayrollPayslipsApiFirst,
  downloadMyPayrollPayslipApiFirst,
} from 'src/services/payrollClaimsApi'
import { CLAIM_TYPE_META } from '../payrollConstants'
import {
  DRAFT_TYPE_ORDER,
  formatDate,
  parseAmount,
  resolveClaimListDisplayAmount,
  resolvePeriodValue,
  toDraftRecord,
} from '../payrollUtils'

const usePayrollClaimsData = ({
  userId,
  activeSection,
  claimId,
  search,
  statusFilter,
  categoryFilter,
  period,
  sort,
  pushToast,
}) => {
  const mergeClaimRows = useCallback((draftRows = [], records = []) => {
    const mergedById = new Map()
    draftRows.forEach((row) => {
      const id = String(row?.id || '').trim()
      if (!id) return
      mergedById.set(id, row)
    })
    records.forEach((row) => {
      const id = String(row?.id || '').trim()
      if (!id) return
      // Submitted records should win over drafts when ids collide.
      mergedById.set(id, row)
    })
    return Array.from(mergedById.values())
  }, [])

  const [claimRecords, setClaimRecords] = useState([])
  const [draftEntriesById, setDraftEntriesById] = useState({})
  const [isClaimsLoading, setIsClaimsLoading] = useState(true)
  const [claimsError, setClaimsError] = useState('')
  const [claimsFilterNowMs, setClaimsFilterNowMs] = useState(() => Date.now())
  const [payslipRows, setPayslipRows] = useState([])
  const [isPayslipsLoading, setIsPayslipsLoading] = useState(false)
  const [payslipsError, setPayslipsError] = useState('')
  const claimsRefreshInFlightRef = useRef(false)
  const queuedReplayTimerRef = useRef(null)
  const lastToastKeyRef = useRef({
    drafts: '',
    claims: '',
    payslips: '',
  })

  const pushToastOnce = useCallback(
    (key, message, options) => {
      const normalizedMessage = String(message || '').trim()
      if (!normalizedMessage) return
      if (lastToastKeyRef.current[key] === normalizedMessage) return
      lastToastKeyRef.current[key] = normalizedMessage
      pushToast(normalizedMessage, options)
    },
    [pushToast],
  )
  const resetToastOnceKey = useCallback((key) => {
    if (!key) return
    lastToastKeyRef.current[key] = ''
  }, [])

  const loadDraftRows = useCallback(async () => {
    const draftResults = await Promise.all(
      DRAFT_TYPE_ORDER.map((type) => loadMyPayrollClaimDraftsApiFirst(userId, type)),
    )
    const hasDraftError = draftResults.some((result) => !result?.ok)
    const dedupedDrafts = new Map()
    draftResults.forEach((result) => {
      const rows = Array.isArray(result?.data) ? result.data : []
      rows.forEach((row) => {
        const id = String(row?.id || '').trim()
        if (id) dedupedDrafts.set(id, row)
      })
    })
    const localDraftRows = loadLocalPayrollAutosaveDrafts(userId)
    localDraftRows.forEach((row) => {
      const id = String(row?.id || '').trim()
      if (!id || dedupedDrafts.has(id)) return
      dedupedDrafts.set(id, row)
    })
    const draftRows = Array.from(dedupedDrafts.values())
      .map((draft) => toDraftRecord(draft, draft?.claimType || 'expense'))
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    return {
      hasDraftError,
      draftRows,
      draftMap: Array.from(dedupedDrafts.entries()).reduce((acc, [id, draft]) => {
        acc[id] = draft
        return acc
      }, {}),
    }
  }, [userId])

  const refreshClaimRows = useCallback(async () => {
    if (!userId || claimsRefreshInFlightRef.current) return
    claimsRefreshInFlightRef.current = true
    try {
      await flushPayrollDraftRetryQueue(userId)
      const { hasDraftError, draftRows, draftMap } = await loadDraftRows()
      if (hasDraftError) {
        pushToastOnce('drafts', 'Unable to load payroll drafts from API. Please retry.', {
          title: 'Draft load failed',
          color: 'danger',
        })
      } else {
        resetToastOnceKey('drafts')
      }
      const result = await loadMyPayrollClaimsApiFirst(userId)
      if (!result?.ok) {
        setClaimsError('Unable to load payroll claims from API. Please retry.')
        pushToastOnce('claims', 'Unable to load payroll claims from API. Please retry.', {
          title: 'Load failed',
          color: 'danger',
        })
      } else {
        setClaimsError('')
        resetToastOnceKey('claims')
      }
      const records = Array.isArray(result?.data)
        ? result.data.map((row) => ({
            ...row,
            displayAmount: resolveClaimListDisplayAmount(row),
          }))
        : []
      setDraftEntriesById(draftMap)
      setClaimRecords(mergeClaimRows(draftRows, records))
    } finally {
      claimsRefreshInFlightRef.current = false
    }
  }, [loadDraftRows, mergeClaimRows, pushToastOnce, resetToastOnceKey, userId])

  useEffect(() => {
    let active = true
    const hydrateClaims = async () => {
      if (!userId) {
        setClaimRecords([])
        setDraftEntriesById({})
        setClaimsError('')
        setIsClaimsLoading(false)
        return
      }
      setIsClaimsLoading(true)
      await flushPayrollDraftRetryQueue(userId)
      const { hasDraftError, draftRows, draftMap } = await loadDraftRows()
      const result = await loadMyPayrollClaimsApiFirst(userId)
      if (!active) return
      if (hasDraftError) {
        pushToastOnce('drafts', 'Unable to load payroll drafts from API. Please retry.', {
          title: 'Draft load failed',
          color: 'danger',
        })
      } else {
        resetToastOnceKey('drafts')
      }
      if (!result?.ok) {
        setClaimsError('Unable to load payroll claims from API. Please retry.')
        pushToastOnce('claims', 'Unable to load payroll claims from API. Please retry.', {
          title: 'Load failed',
          color: 'danger',
        })
      } else {
        setClaimsError('')
        resetToastOnceKey('claims')
      }
      const records = Array.isArray(result?.data)
        ? result.data.map((row) => ({
            ...row,
            displayAmount: resolveClaimListDisplayAmount(row),
          }))
        : []
      setDraftEntriesById(draftMap)
      setClaimRecords(mergeClaimRows(draftRows, records))
      setIsClaimsLoading(false)
    }
    hydrateClaims()
    return () => {
      active = false
    }
  }, [activeSection, loadDraftRows, mergeClaimRows, pushToastOnce, resetToastOnceKey, userId])

  useEffect(() => {
    const replayQueuedDrafts = async () => {
      await flushPayrollDraftRetryQueue(userId)
      await refreshClaimRows()
    }

    const scheduleReplayQueuedDrafts = () => {
      if (queuedReplayTimerRef.current) {
        window.clearTimeout(queuedReplayTimerRef.current)
      }
      queuedReplayTimerRef.current = window.setTimeout(() => {
        queuedReplayTimerRef.current = null
        void replayQueuedDrafts()
      }, 500)
    }

    const onOnline = () => {
      scheduleReplayQueuedDrafts()
    }
    const onFocus = () => {
      scheduleReplayQueuedDrafts()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleReplayQueuedDrafts()
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (queuedReplayTimerRef.current) {
        window.clearTimeout(queuedReplayTimerRef.current)
        queuedReplayTimerRef.current = null
      }
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refreshClaimRows, userId])

  useEffect(() => {
    setClaimsFilterNowMs(Date.now())
  }, [period, activeSection])

  useEffect(() => {
    if (period === 'all') return undefined
    const timerId = window.setInterval(() => {
      setClaimsFilterNowMs(Date.now())
    }, 60 * 1000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [period])

  useEffect(() => {
    let active = true
    const hydratePayslips = async () => {
      if (activeSection !== 'payslips') return
      if (!userId) {
        setPayslipRows([])
        setPayslipsError('')
        setIsPayslipsLoading(false)
        return
      }
      setIsPayslipsLoading(true)
      setPayslipsError('')
      const result = await loadMyPayrollPayslipsApiFirst()
      if (!active) return
      if (!result?.ok) {
        setPayslipsError('Unable to load payslips from API. Please retry.')
        setPayslipRows([])
        pushToastOnce('payslips', 'Unable to load payslips from API. Please retry.', {
          title: 'Load failed',
          color: 'danger',
        })
        setIsPayslipsLoading(false)
        return
      }
      setPayslipRows(Array.isArray(result?.data) ? result.data : [])
      resetToastOnceKey('payslips')
      setIsPayslipsLoading(false)
    }
    hydratePayslips()
    return () => {
      active = false
    }
  }, [activeSection, pushToastOnce, resetToastOnceKey, userId])

  const filteredClaims = useMemo(() => {
    const term = search.trim().toLowerCase()
    const [sortField, sortDir] = sort.split(':')
    let next = [...claimRecords]

    if (term) {
      next = next.filter((claim) => {
        const haystack =
          `${claim.id} ${claim.period} ${claim.category} ${claim.categoryDetail || ''} ${claim.status}`.toLowerCase()
        return haystack.includes(term)
      })
    }

    if (statusFilter !== 'All') {
      next = next.filter((claim) => claim.status === statusFilter)
    }

    if (categoryFilter !== 'All') {
      next = next.filter((claim) => claim.category === categoryFilter)
    }

    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = new Date(claimsFilterNowMs - days * 24 * 60 * 60 * 1000)
        next = next.filter((claim) => {
          const submitted = new Date(claim.submittedAt)
          return !Number.isNaN(submitted.getTime()) && submitted >= cutoff
        })
      }
    }

    if (sortField === 'amount') {
      next.sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        const av = parseAmount(a.displayAmount ?? a.amount)
        const bv = parseAmount(b.displayAmount ?? b.amount)
        if (av !== bv) return av > bv ? dir : -dir
        const at = new Date(a?.submittedAt).getTime()
        const bt = new Date(b?.submittedAt).getTime()
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0
        if (Number.isNaN(at)) return 1
        if (Number.isNaN(bt)) return -1
        return bt - at
      })
      return next
    }

    const monthDirection = sortDir === 'asc' ? 1 : -1
    const resolveMonthOrder = (claim) => {
      const periodValue = resolvePeriodValue(claim)
      if (!/^\d{4}-\d{2}$/.test(periodValue)) return null
      const [yearRaw, monthRaw] = periodValue.split('-')
      const year = Number(yearRaw)
      const month = Number(monthRaw)
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null
      }
      return year * 100 + month
    }

    const compareWithinMonth = (a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const toSortableSubmittedTime = (claim) => {
        const parsed = new Date(claim?.submittedAt).getTime()
        return Number.isFinite(parsed) ? parsed : -Infinity
      }
      const av = toSortableSubmittedTime(a)
      const bv = toSortableSubmittedTime(b)
      if (av !== bv) return av > bv ? dir : -dir
      if (av === bv) return 0
      return av > bv ? -1 : 1
    }

    next.sort((a, b) => {
      const monthA = resolveMonthOrder(a)
      const monthB = resolveMonthOrder(b)
      if (monthA !== monthB) {
        if (monthA === null) return 1
        if (monthB === null) return -1
        return monthA > monthB ? monthDirection : -monthDirection
      }
      return compareWithinMonth(a, b)
    })
    return next
  }, [categoryFilter, claimRecords, claimsFilterNowMs, period, search, sort, statusFilter])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredClaims)
  const selectedClaim = useMemo(() => {
    const matches = claimRecords.filter((claim) => claim.id === claimId)
    if (matches.length === 0) return null
    return matches.find((claim) => !claim?.isDraft) || matches[0]
  }, [claimId, claimRecords])
  const selectedClaimTypeMeta = useMemo(() => {
    if (!selectedClaim) return CLAIM_TYPE_META.expense
    return CLAIM_TYPE_META[selectedClaim.type] || CLAIM_TYPE_META.expense
  }, [selectedClaim])

  const submittedClaimItems = useMemo(() => {
    if (!selectedClaim) return []
    if (Array.isArray(selectedClaim.items) && selectedClaim.items.length > 0) {
      return selectedClaim.items.map((item, index) => ({
        id: `${selectedClaim.id}-${index}`,
        title: item.category || item.claimType || selectedClaim.category || 'Claim item',
        date: item.expenseDate || item.claimDate || selectedClaim.submittedAt || '',
        note: item.lineNotes || item.notes || '',
        attachmentName: item.attachmentName || '',
        amount: parseAmount(item.amount),
      }))
    }
    return [
      {
        id: `${selectedClaim.id}-summary`,
        title: selectedClaim.category || 'Claim item',
        date: selectedClaim.submittedAt || '',
        note: selectedClaim.notes || 'No line item details were saved for this submission.',
        attachmentName: selectedClaim.attachmentName || '',
        amount: parseAmount(selectedClaim.amount),
      },
    ]
  }, [selectedClaim])

  const salaryDetailSummary = useMemo(() => {
    if (!selectedClaim || selectedClaim.type !== 'salary') return null
    const baselineNet = parseAmount(selectedClaim?.payrollSnapshot?.net)
    const approvedOvertimePayout = parseAmount(selectedClaim?.approvedOvertimePayout)
    const adjustmentsTotal = parseAmount(selectedClaim?.adjustmentsTotal)
    const finalPayable = parseAmount(selectedClaim?.projectedNetPayout)
    return {
      baselineNet,
      adjustmentsTotal,
      approvedOvertimePayout,
      finalPayable,
    }
  }, [selectedClaim])

  const submittedClaimTotal = useMemo(
    () => submittedClaimItems.reduce((sum, item) => sum + parseAmount(item.amount), 0),
    [submittedClaimItems],
  )
  const submittedClaimTotalValue = useMemo(() => {
    if (!selectedClaim) return 0
    if (selectedClaim.type === 'salary') {
      return parseAmount(selectedClaim.projectedNetPayout)
    }
    if (Array.isArray(selectedClaim.items) && selectedClaim.items.length > 0) {
      return submittedClaimTotal
    }
    return parseAmount(selectedClaim.amount)
  }, [selectedClaim, submittedClaimTotal])

  const categoryOptions = useMemo(
    () => [
      { value: 'All', label: 'All claim types' },
      ...Array.from(
        new Set(
          claimRecords
            .map((claim) => String(claim?.category || '').trim())
            .filter((category) => category.length > 0),
        ),
      ).map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [claimRecords],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All status' },
      ...Array.from(
        new Set(
          claimRecords
            .map((claim) => String(claim?.status || '').trim())
            .filter((status) => status.length > 0),
        ),
      ).map((status) => ({
        value: status,
        label: status,
      })),
    ],
    [claimRecords],
  )

  const downloadPayslip = useCallback(
    async (row) => {
      const payslipId = Number(row?.payslipId || row?.id || 0) || 0
      if (!row?.downloadable || !payslipId) {
        pushToast('Payslip download link is not available for this record.', {
          title: 'Download unavailable',
          color: 'warning',
        })
        return
      }
      const result = await downloadMyPayrollPayslipApiFirst(payslipId)
      if (!result?.ok || !result?.data?.blob) {
        pushToast('Unable to download payslip from API. Please retry.', {
          title: 'Download failed',
          color: 'danger',
        })
        return
      }
      const objectUrl = URL.createObjectURL(result.data.blob)
      try {
        const defaultExt = String(result?.data?.contentType || '').includes('application/pdf')
          ? 'pdf'
          : 'json'
        const fileName =
          result.data.filename ||
          row?.downloadFilename ||
          `${row?.month || 'payslip'}.${defaultExt}`
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = fileName
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    },
    [pushToast],
  )

  return {
    claimRecords,
    draftEntriesById,
    isClaimsLoading,
    claimsError,
    payslipRows,
    isPayslipsLoading,
    payslipsError,
    filteredClaims,
    rowsToShow,
    setRowsToShow,
    visibleClaims: visibleRows,
    selectedClaim,
    selectedClaimTypeMeta,
    submittedClaimItems,
    salaryDetailSummary,
    submittedClaimTotalValue,
    categoryOptions,
    statusOptions,
    refreshClaimRows,
    downloadPayslip,
  }
}

export default usePayrollClaimsData
