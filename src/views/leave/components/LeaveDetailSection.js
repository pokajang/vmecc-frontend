import React from 'react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import DisclosureCard from 'src/components/DisclosureCard'
import PageState from 'src/components/PageState'
import RecordDetailActions from 'src/components/report-workflow/RecordDetailActions'
import RecordDetailSummary from 'src/components/report-workflow/RecordDetailSummary'
import ResponsiveKeyValueList from 'src/components/workflow/ResponsiveKeyValueList'
import { buildApiUrl } from 'src/services/apiClient'

const resolveLeaveGates = (record) => {
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

const formatRosterImpact = (record) => {
  const snapshot = record?.rosterImpactSnapshot
  const items = snapshot?.items
  if (!Array.isArray(items) || items.length === 0) return '-'
  const duties = items
    .map((item) => `${item.shift_label || item.shift} shift, ${item.team_name}, ${item.date}`)
    .join('; ')
  return snapshot?.observed_at ? `${duties} (captured ${snapshot.observed_at})` : duties
}

const LeaveDetailSection = ({
  selectedRecord,
  selectedRecordPendingActionHint,
  selectedRecordHistoryEntries = [],
  onBack,
  getDisplayLeaveId,
  getScheduleLabel,
  getStatusBadge,
  formatDate,
  formatDateTime,
  canEdit = false,
  canCancel = false,
  canDelete = false,
  showHeaderBack = true,
  isLoading = false,
  onEdit,
  onCancel,
  onDelete,
  testId = 'leave-detail-section',
}) => {
  if (!selectedRecord) {
    return (
      <>
        {showHeaderBack ? <BackButton onClick={onBack} /> : null}
        {isLoading ? (
          <PageState variant="loading" message="Loading leave record..." />
        ) : (
          <PageState variant="error" message="Leave record not found." />
        )}
      </>
    )
  }

  const renderDetailActions = (mode) => (
    <RecordDetailActions
      record={selectedRecord}
      mode={mode}
      ariaLabel="Leave record actions"
      testAnchorPrefix="leave"
      handlers={{
        edit: onEdit,
        cancel: onCancel,
        delete: onDelete,
      }}
      fallbackCapabilities={{ edit: canEdit, cancel: canCancel, delete: canDelete }}
    />
  )

  return (
    <div className="inspection-detail-section" data-testid={testId}>
      <div className="inspection-form-sections d-grid gap-4">
        <RecordDetailSummary
          title={selectedRecord.leaveType || 'Leave request'}
          status={
            getStatusBadge
              ? getStatusBadge(selectedRecord.status || '-', selectedRecord.status || '-')
              : selectedRecord.status || ''
          }
          context={getScheduleLabel(selectedRecord)}
          metadata={[
            getDisplayLeaveId(selectedRecord),
            `Applied ${formatDate(selectedRecord.appliedAt)}`,
          ]}
          nextAction={selectedRecord.nextActionRole || selectedRecordPendingActionHint}
          actions={
            <div className="d-flex align-items-start gap-2">
              <div className="d-none d-md-block">{renderDetailActions('desktop')}</div>
              {showHeaderBack ? <BackButton onClick={onBack} /> : null}
            </div>
          }
        />

        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Leave details</div>
          <ResponsiveKeyValueList
            compact
            items={[
              { label: 'Days', value: selectedRecord.days },
              { label: 'Reason', value: selectedRecord.reason || '-' },
              {
                label: 'Evidence',
                value: selectedRecord.attachmentAvailable ? (
                  <a
                    href={buildApiUrl(`/leave/attachments/${selectedRecord.attachmentId}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedRecord.attachmentName || 'View attachment'}
                  </a>
                ) : (
                  '-'
                ),
              },
              { label: 'Coverage By', value: selectedRecord.coverBy || '-' },
            ]}
          />
        </section>

        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Workflow progress</div>
          <ApprovalGates
            gates={resolveLeaveGates(selectedRecord)}
            approvalHistory={selectedRecord.approvalHistory}
            isCancelled={selectedRecord.status === 'Cancelled'}
            direction="horizontal"
          />
          <AuditHistoryPanel
            title="Activity"
            entries={selectedRecordHistoryEntries}
            emptyMessage="No workflow activity yet."
            formatDateTime={formatDateTime}
            compact
          />
        </section>

        <DisclosureCard
          summary={
            <div>
              <div className="fw-semibold">Request information</div>
              <div className="small text-body-secondary">
                Applied {formatDate(selectedRecord.appliedAt)}
              </div>
            </div>
          }
        >
          <ResponsiveKeyValueList
            compact
            items={[
              { label: 'Current Action Owner', value: selectedRecord.nextActionRole || '-' },
              {
                label: 'Workflow Scope',
                value: selectedRecord.workflowTeamName || 'Organization-wide',
              },
              { label: 'Applicant Role', value: selectedRecord.workflowApplicantRole || '-' },
              { label: 'Roster Impact', value: formatRosterImpact(selectedRecord) },
            ]}
          />
        </DisclosureCard>

        {renderDetailActions('mobile')}
      </div>
    </div>
  )
}

export default LeaveDetailSection
