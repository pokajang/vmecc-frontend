import React from 'react'
import {
  CBadge,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { LoaderCircle, Plus } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import GroupedTableHeaderRow, { GroupTotalBadge } from 'src/components/GroupedTableHeader'
import MobileRecordList from 'src/components/MobileRecordList'
import RowActions from 'src/components/RowActions'

const MONTH_INDEX_BY_NAME = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

const formatPeriodLabel = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || ''
  const [yearRaw, monthRaw] = value.split('-')
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

const resolvePeriodKey = (claim) => {
  const periodValue = String(claim?.periodValue || '').trim()
  if (/^\d{4}-\d{2}$/.test(periodValue)) {
    return {
      key: periodValue,
      label: formatPeriodLabel(periodValue) || 'Unknown month',
    }
  }

  const periodLabel = String(claim?.period || '').trim()
  if (periodLabel) {
    const matched = /^([A-Za-z]+)\s+(\d{4})$/.exec(periodLabel)
    if (matched) {
      const month = MONTH_INDEX_BY_NAME[matched[1].toLowerCase()]
      if (month) {
        const key = `${matched[2]}-${String(month).padStart(2, '0')}`
        return {
          key,
          label: formatPeriodLabel(key) || periodLabel,
        }
      }
    }
  }

  return { key: 'unknown', label: 'Unknown month' }
}

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const resolveDisplayAmount = (claim = {}) => {
  const isSalaryClaim = String(claim?.type || '').trim() === 'salary'
  if (isSalaryClaim) {
    if (claim?.projectedNetPayout !== null && typeof claim?.projectedNetPayout !== 'undefined') {
      return parseAmount(claim.projectedNetPayout)
    }
    return 0
  }
  if (claim?.displayAmount !== null && typeof claim?.displayAmount !== 'undefined') {
    return parseAmount(claim.displayAmount)
  }
  return parseAmount(claim.amount)
}

const resolveSalaryClaimSupplements = (claim = {}) => {
  const isSalaryClaim = String(claim?.type || '').trim() === 'salary'
  if (!isSalaryClaim) return []

  const hasOvertime =
    parseAmount(claim?.approvedOvertimePayout) > 0 ||
    (Array.isArray(claim?.overtimeRows) && claim.overtimeRows.length > 0)
  const hasAdjustments =
    parseAmount(claim?.adjustmentsTotal) !== 0 ||
    (Array.isArray(claim?.items) && claim.items.length > 0)

  const labels = []
  if (hasOvertime) labels.push('Overtime')
  if (hasAdjustments) labels.push('Adjustment')
  return labels
}

const PAYROLL_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const TERMINAL_STATUSES = ['Approved', 'Paid', 'Rejected', 'Cancelled']
const STATUS_COLORS = {
  Approved: 'success',
  Paid: 'success',
  Rejected: 'danger',
  Cancelled: 'secondary',
  Pending: 'warning',
  Checked: 'info',
  Reviewed: 'info',
  Draft: 'secondary',
}

const resolveStatusLabel = (claim = {}) => {
  if (claim?.isDraft) return claim?.localOnly ? 'Draft (Syncing)' : 'Draft'
  return String(claim?.status || '').trim() || '-'
}

const resolveNextState = (claim = {}) => {
  const status = resolveStatusLabel(claim)
  if (claim?.isDraft) return status
  if (TERMINAL_STATUSES.includes(status)) return status

  const completedActions = new Set(
    (Array.isArray(claim?.approvalHistory) ? claim.approvalHistory : []).map(
      (entry) => entry?.action,
    ),
  )
  const nextGate = PAYROLL_GATES.find((gate) => !completedActions.has(gate.action))
  return nextGate ? `Pending ${nextGate.label}` : status
}

const renderStatusBadge = (claim = {}) => {
  const status = resolveStatusLabel(claim)
  return <CBadge color={STATUS_COLORS[status] || 'secondary'}>{status}</CBadge>
}

const ClaimListTable = ({
  claims = [],
  groupByPeriod = true,
  onOpenClaim = () => {},
  onEditClaim = () => {},
  onCancelClaim = () => {},
  onDownloadAttachment = () => {},
  onDeleteClaim = () => {},
  formatCurrency = (value) => value,
  formatDate = (value) => value,
}) => {
  const groupMeta = new Map()
  const firstDraftClaimId = String(claims.find((claim) => Boolean(claim?.isDraft))?.id || '').trim()

  claims.forEach((claim) => {
    const meta = resolvePeriodKey(claim)
    if (!groupMeta.has(meta.key)) {
      groupMeta.set(meta.key, { label: meta.label, total: 0, count: 0 })
    }
    const entry = groupMeta.get(meta.key)
    entry.total += resolveDisplayAmount(claim)
    entry.count += 1
  })

  const getClaimActionItems = (claim) => {
    const isDraft = Boolean(claim?.isDraft)
    const isLocalSyncingDraft = Boolean(claim?.localOnly)
    const status = String(claim?.status || '').trim()
    const isTerminal = TERMINAL_STATUSES.includes(status)
    const canDeleteByStatus = isDraft || status === 'Cancelled'
    const editCapability = claim?.actionPermissions?.edit || null
    const cancelCapability = claim?.actionPermissions?.cancel || null
    const deleteCapability = claim?.actionPermissions?.delete || null
    const downloadCapability = claim?.actionPermissions?.downloadAttachment || null
    const disableCancel =
      isDraft || isTerminal || isLocalSyncingDraft || cancelCapability?.enabled === false
    const disableEdit = (!isDraft && isTerminal) || editCapability?.enabled === false
    const disableDelete = !canDeleteByStatus || deleteCapability?.enabled === false
    const disableDownload =
      !claim.attachmentAvailable ||
      isLocalSyncingDraft ||
      downloadCapability?.enabled === false ||
      claim?.attachmentOwnedByViewer === false

    return [
      {
        key: 'edit-claim',
        label: 'Edit',
        onClick: () => onEditClaim(claim),
        disabled: disableEdit,
        disabledReason: editCapability?.blockedReason || 'This claim can no longer be edited.',
      },
      {
        key: 'cancel-claim',
        label: 'Cancel',
        onClick: () => onCancelClaim(claim),
        disabled: disableCancel,
        disabledReason:
          cancelCapability?.blockedReason || 'Only active submitted claims can be cancelled.',
      },
      {
        key: 'delete-claim',
        label: 'Delete',
        onClick: () => onDeleteClaim(claim),
        disabled: disableDelete,
        disabledReason:
          deleteCapability?.blockedReason || 'Please cancel this claim before deleting it.',
        className: 'text-danger',
      },
      {
        key: 'download-attachment',
        label: claim.attachmentAvailable ? 'Download attachment' : 'No attachment',
        onClick: () => onDownloadAttachment(claim),
        disabled: disableDownload,
        disabledReason:
          downloadCapability?.blockedReason ||
          (claim?.attachmentOwnedByViewer === false
            ? 'Attachment access is restricted for this claim.'
            : 'Attachment is not available for this claim.'),
      },
    ]
  }

  const mobileSections = []
  if (groupByPeriod) {
    claims.forEach((claim) => {
      const meta = resolvePeriodKey(claim)
      let section = mobileSections.find((entry) => entry.key === meta.key)
      if (!section) {
        const summary = groupMeta.get(meta.key) || { label: meta.label, total: 0, count: 0 }
        section = {
          key: meta.key,
          label: summary.label || 'Unknown month',
          summary: `${summary.count} ${summary.count === 1 ? 'record' : 'records'} - ${formatCurrency(
            summary.total,
          )}`,
          items: [],
        }
        mobileSections.push(section)
      }
      section.items.push(claim)
    })
  } else {
    mobileSections.push({
      key: 'all-claims',
      label: '',
      summary: '',
      items: claims,
    })
  }

  const mobileRecordSections = mobileSections.map((section) => ({
    ...section,
    items: section.items.map((claim) => {
      const salarySupplements = resolveSalaryClaimSupplements(claim)
      const isSalaryClaim = String(claim?.type || '').trim() === 'salary'
      const detail = isSalaryClaim
        ? salarySupplements.length > 0
          ? salarySupplements.join(', ')
          : ''
        : claim.categoryDetail || ''

      return {
        key: claim.id,
        title: claim.id,
        eyebrow: claim.category || 'Claim',
        subtitle: detail || claim.period || '-',
        status: renderStatusBadge(claim),
        ariaLabel: `Open claim ${claim.id} summary`,
        onOpen: () => onOpenClaim(claim),
        fields: [
          { key: 'period', label: 'Period', value: claim.period || '-' },
          { key: 'submitted', label: 'Submitted', value: formatDate(claim.submittedAt) },
          { key: 'amount', label: 'Amount', value: formatCurrency(resolveDisplayAmount(claim)) },
          { key: 'next', label: 'Next', value: resolveNextState(claim) },
        ],
        actions: (
          <RowActions
            items={getClaimActionItems(claim)}
            testId={
              claim?.isDraft && firstDraftClaimId === String(claim.id || '').trim()
                ? 'payroll-claim-draft-resume-action'
                : ''
            }
          />
        ),
      }
    }),
  }))

  let lastGroupKey = null
  let index = 0

  return (
    <>
      <MobileRecordList sections={mobileRecordSections} variant="list-group" />
      <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
        <CTable align="middle" className="mb-0" hover responsive>
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                #
              </CTableHeaderCell>
              <CTableHeaderCell>Claim ID</CTableHeaderCell>
              <CTableHeaderCell>Period</CTableHeaderCell>
              <CTableHeaderCell>Claim Type</CTableHeaderCell>
              <CTableHeaderCell>Submitted</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {claims.flatMap((claim) => {
              const rows = []
              const meta = resolvePeriodKey(claim)
              if (groupByPeriod && meta.key !== lastGroupKey) {
                lastGroupKey = meta.key
                const summary = groupMeta.get(meta.key) || { label: meta.label, total: 0, count: 0 }
                rows.push(
                  <GroupedTableHeaderRow
                    key={`group-${meta.key}`}
                    colSpan={8}
                    label={summary.label || 'Unknown month'}
                    count={summary.count}
                  >
                    <GroupTotalBadge label="Total" value={formatCurrency(summary.total)} />
                  </GroupedTableHeaderRow>,
                )
              }
              index += 1
              const isDraft = Boolean(claim?.isDraft)
              const isLocalSyncingDraft = Boolean(claim?.localOnly)
              const salarySupplements = resolveSalaryClaimSupplements(claim)
              rows.push(
                <CTableRow
                  key={claim.id}
                  role="button"
                  className="cursor-pointer"
                  tabIndex={0}
                  aria-label={`Open claim ${claim.id}`}
                  onClick={() => onOpenClaim(claim)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenClaim(claim)
                    }
                  }}
                >
                  <CTableDataCell className="text-center text-muted">{index}</CTableDataCell>
                  <CTableDataCell className="fw-semibold">{claim.id}</CTableDataCell>
                  <CTableDataCell>{claim.period}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-medium">{claim.category}</div>
                    {String(claim?.type || '').trim() === 'salary' ? (
                      salarySupplements.length > 0 ? (
                        <div className="small text-body-secondary d-inline-flex align-items-center gap-1">
                          <Plus size={11} />
                          <span>{salarySupplements.join(', ')}</span>
                        </div>
                      ) : null
                    ) : claim.categoryDetail ? (
                      <div className="small text-body-secondary">{claim.categoryDetail}</div>
                    ) : null}
                  </CTableDataCell>
                  <CTableDataCell>{formatDate(claim.submittedAt)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    {formatCurrency(resolveDisplayAmount(claim))}
                  </CTableDataCell>
                  <CTableDataCell>
                    {isDraft ? (
                      <div className="small d-inline-flex align-items-center text-body-secondary">
                        <LoaderCircle size={12} className="me-1" />
                        {isLocalSyncingDraft ? 'Draft (Syncing)' : 'Draft'}
                      </div>
                    ) : (
                      <ApprovalGates
                        gates={PAYROLL_GATES}
                        approvalHistory={claim.approvalHistory}
                        isCancelled={claim.status === 'Cancelled'}
                      />
                    )}
                  </CTableDataCell>
                  <CTableDataCell
                    className="text-center align-middle"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <RowActions
                      items={getClaimActionItems(claim)}
                      testId={
                        isDraft && firstDraftClaimId === String(claim.id || '').trim()
                          ? 'payroll-claim-draft-resume-action'
                          : ''
                      }
                    />
                  </CTableDataCell>
                </CTableRow>,
              )
              return rows
            })}
          </CTableBody>
        </CTable>
      </div>
    </>
  )
}

export default ClaimListTable
