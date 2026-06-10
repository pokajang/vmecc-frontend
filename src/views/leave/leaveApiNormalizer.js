/**
 * Maps API snake_case leave records to the camelCase shape used throughout the frontend.
 *
 * Key convention:
 *   row.id         = display_id string  (e.g. "LV-AL-2026-001") – used for routing & display
 *   row._id        = integer DB primary key                      – used for API calls
 *   row.ownerUserId= string user_id of the leave owner
 *   row.recordKey  = "ownerUserId::displayId"                    – mirrors the old localStorage key
 */
export const normalizeApiLeaveRecord = (record) => {
  const attachment = record.attachment || null
  const ownerId = String(record.user_id ?? record.owner_user_id ?? '')

  return {
    _id: record.id, // integer DB id
    id: record.display_id ?? String(record.id), // display_id used as route key
    display_id: record.display_id ?? String(record.id),
    ownerUserId: ownerId,
    employee: record.employee ?? '',
    team: record.team ?? '',
    leaveType: record.leave_type ?? '',
    status: record.status ?? 'Pending',
    startDate: record.start_date ?? '',
    endDate: record.end_date ?? '',
    days: Number(record.days) || 0,
    workShift: record.work_shift ?? 'normal',
    startTimeSlot: record.start_time_slot ?? 'shift-start',
    endTimeSlot: record.end_time_slot ?? 'shift-end',
    reason: record.reason ?? '',
    coverBy: record.cover_by ?? '',
    appliedAt: record.applied_at ?? null,
    workflowStage: record.workflow_stage ?? null,
    workflowSnapshot: record.workflow_snapshot ?? null,
    nextActionRole: record.next_action_role ?? null,
    applicantRoles: Array.isArray(record.applicant_roles) ? record.applicant_roles : [],
    approvalHistory: Array.isArray(record.approval_history) ? record.approval_history : [],
    submittedBy: record.submitted_by ?? '',
    // Attachment fields (flattened for compatibility with existing components)
    attachmentId: attachment?.id ?? null,
    attachmentName: attachment?.original_name ?? '',
    attachmentMimeType: attachment?.mime_type ?? '',
    attachmentSize: attachment?.size ?? null,
    attachmentOriginalSize: attachment?.original_size ?? null,
    attachmentCompressed: Boolean(attachment?.was_compressed),
    attachmentAvailable: Boolean(attachment),
    // Staff / management fields
    recordKey: record.record_key ?? `${ownerId}::${record.display_id ?? record.id}`,
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
  }
}

export const normalizeApiAssignmentRow = (row) => ({
  id: row.id,
  user_id: row.user_id,
  year: Number(row.year),
  leaveType: row.leave_type,
  entitlement: Number(row.entitlement) || 0,
  used: Number(row.used) || 0,
  pending: Number(row.pending) || 0,
  employee: row.employee ?? '',
  team: row.team ?? '',
})
