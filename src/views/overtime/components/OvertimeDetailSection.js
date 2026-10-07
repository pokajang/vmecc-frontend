import React from 'react'
import { CButton } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import DisclosureCard from 'src/components/DisclosureCard'
import PageState from 'src/components/PageState'
import RecordDetailActions from 'src/components/report-workflow/RecordDetailActions'
import RecordDetailSummary from 'src/components/report-workflow/RecordDetailSummary'
import ResponsiveKeyValueList from 'src/components/workflow/ResponsiveKeyValueList'
import WorkflowDetailActions from 'src/components/workflow/WorkflowDetailActions'
import { downloadWorkflowAttachment } from 'src/services/apiClient'
import { formatDuration, getOvertimeTypeLabel, resolveOvertimeGates } from '../utils'

const OvertimeDetailSection = ({
  selectedRecord,
  selectedRecordPendingActionHint,
  selectedRecordStatusLabel,
  selectedRecordHistoryEntries = [],
  onBack,
  getDisplayOvertimeId,
  getScheduleLabel,
  getStatusBadge,
  formatDate,
  formatDateTime,
  showGuidanceMetadata = false,
  canEdit = false,
  canCancel = false,
  canDelete = false,
  onEdit,
  onCancel,
  onDelete,
  showPageHeader = false,
  showHeaderBack = true,
  isLoading = false,
  reviewerActions = null,
}) => {
  if (!selectedRecord) {
    return (
      <>
        {showHeaderBack || !showPageHeader ? <BackButton onClick={onBack} /> : null}
        {isLoading ? (
          <PageState variant="loading" message="Loading overtime record..." />
        ) : (
          <PageState variant="error" message="Overtime record not found." />
        )}
      </>
    )
  }

  const hasReviewerActions =
    reviewerActions &&
    (!reviewerActions.primaryDisabled ||
      !reviewerActions.rejectDisabled ||
      !reviewerActions.correctionDisabled)
  const renderApplicantActions = (mode) => (
    <RecordDetailActions
      record={selectedRecord}
      mode={mode}
      ariaLabel="Overtime applicant actions"
      testAnchorPrefix="overtime"
      handlers={{
        edit: onEdit,
        cancel: onCancel,
        delete: onDelete,
      }}
      fallbackCapabilities={{ edit: canEdit, cancel: canCancel, delete: canDelete }}
    />
  )
  const renderReviewActions = () =>
    hasReviewerActions ? (
      <WorkflowDetailActions
        statusMessage={reviewerActions.statusMessage}
        ariaLabel="Overtime review actions"
        mobileBehavior="terminal"
      >
        {!reviewerActions.correctionDisabled ? (
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => reviewerActions.onCorrection?.(selectedRecord)}
          >
            Request correction
          </CButton>
        ) : null}
        {!reviewerActions.rejectDisabled ? (
          <CButton
            color="danger"
            variant="outline"
            onClick={() => reviewerActions.onReject?.(selectedRecord)}
          >
            Reject
          </CButton>
        ) : null}
        {!reviewerActions.primaryDisabled ? (
          <CButton color="primary" onClick={() => reviewerActions.onPrimary?.(selectedRecord)}>
            {reviewerActions.primaryLabel || 'Approve'}
          </CButton>
        ) : null}
      </WorkflowDetailActions>
    ) : null

  return (
    <div className="inspection-detail-section" data-testid="overtime-detail-section">
      <div className="inspection-form-sections d-grid gap-4">
        <RecordDetailSummary
          title={getOvertimeTypeLabel(selectedRecord.overtimeType)}
          status={
            getStatusBadge
              ? getStatusBadge(
                  selectedRecord.status || '-',
                  selectedRecordStatusLabel || selectedRecord.status || '-',
                )
              : selectedRecordStatusLabel || selectedRecord.status || ''
          }
          context={getScheduleLabel(selectedRecord)}
          metadata={[
            getDisplayOvertimeId(selectedRecord),
            `Applied ${formatDate(selectedRecord.appliedAt)}`,
          ]}
          nextAction={selectedRecord.nextActionRole || selectedRecordPendingActionHint}
          actions={
            <div className="d-flex align-items-start gap-2">
              <div className="d-none d-md-block">
                {hasReviewerActions ? renderReviewActions() : renderApplicantActions('desktop')}
              </div>
              {showHeaderBack ? <BackButton onClick={onBack} /> : null}
            </div>
          }
        />

        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Overtime details</div>
          <ResponsiveKeyValueList
            compact
            items={[
              { label: 'Claim Date', value: formatDate(selectedRecord.claimDate) },
              { label: 'Duration', value: formatDuration(selectedRecord.durationMinutes) },
              { label: 'Reason', value: selectedRecord.reason || '-' },
              {
                label: 'Evidence',
                value: selectedRecord.attachment?.originalName ? (
                  <CButton
                    color="light"
                    size="sm"
                    className="workflow-attachment-action text-end"
                    aria-label={`Download evidence ${selectedRecord.attachment.originalName}`}
                    onClick={() => downloadWorkflowAttachment(selectedRecord.attachment.id)}
                  >
                    {selectedRecord.attachment.originalName}
                  </CButton>
                ) : (
                  '-'
                ),
              },
            ]}
          />
          {showGuidanceMetadata && selectedRecord?.guidance_meta ? (
            <DisclosureCard
              summary={
                <div>
                  <div className="fw-semibold">Holiday guidance</div>
                  <div className="small text-body-secondary">
                    Recommended{' '}
                    {getOvertimeTypeLabel(selectedRecord.guidance_meta.derived_overtime_type)}
                  </div>
                </div>
              }
            >
              <ResponsiveKeyValueList
                compact
                items={[
                  {
                    label: 'Recommended type',
                    value: getOvertimeTypeLabel(selectedRecord.guidance_meta.derived_overtime_type),
                  },
                  {
                    label: 'Effective state',
                    value: selectedRecord.guidance_meta.effective_state || 'National only',
                  },
                  selectedRecord.guidance_meta.overtime_type_adjusted_message
                    ? {
                        label: 'Adjustment',
                        value: selectedRecord.guidance_meta.overtime_type_adjusted_message,
                      }
                    : null,
                ]}
              />
            </DisclosureCard>
          ) : null}
        </section>

        <section className="inspection-form-section d-grid gap-3">
          <div className="fw-semibold text-muted">Workflow progress</div>
          <ApprovalGates
            gates={resolveOvertimeGates(selectedRecord)}
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
            ]}
          />
        </DisclosureCard>

        <div className="d-md-none">
          {hasReviewerActions ? renderReviewActions() : renderApplicantActions('mobile')}
        </div>
      </div>
    </div>
  )
}

export default OvertimeDetailSection
