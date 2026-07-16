import React from 'react'
import RecordDetailActions from 'src/components/report-workflow/RecordDetailActions'

const InspectionDetailActionBar = ({
  record,
  onBack,
  onEditRecord,
  canEditRecord,
  onDeleteRecord,
  canDeleteRecord,
  onReviewRecord,
  onApproveRecord,
  onRejectRecord,
  onDownloadRecord,
  downloadingId = null,
  isActionBusy = false,
  isDeleting = false,
  mode = 'both',
  testAnchorPrefix = 'inspection-detail',
}) => (
  <RecordDetailActions
    record={record}
    mode={mode}
    ariaLabel="Inspection detail actions"
    testAnchorPrefix={testAnchorPrefix}
    downloadingId={downloadingId}
    isActionBusy={isActionBusy}
    isDeleting={isDeleting}
    handlers={{
      back: onBack,
      edit: typeof onEditRecord === 'function' ? (row) => onEditRecord(row) : null,
      delete: typeof onDeleteRecord === 'function' ? (row) => onDeleteRecord(row) : null,
      review: typeof onReviewRecord === 'function' ? (row) => onReviewRecord(row) : null,
      approve: typeof onApproveRecord === 'function' ? (row) => onApproveRecord(row) : null,
      reject: typeof onRejectRecord === 'function' ? (row) => onRejectRecord(row) : null,
      download: typeof onDownloadRecord === 'function' ? (row) => onDownloadRecord(row.id) : null,
    }}
    fallbackCapabilities={{
      edit: canEditRecord,
      delete: canDeleteRecord,
      review: (row) => row?.canReview === true,
      approve: (row) => row?.canApprove === true,
      reject: (row) => row?.canReject === true,
    }}
  />
)

export default InspectionDetailActionBar
