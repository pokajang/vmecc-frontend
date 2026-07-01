import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { buildExpenseClaimEditorSchema } from './claimFormViewModel'
import { PAYROLL_ATTACHMENT_ACCEPT, PAYROLL_ATTACHMENT_MAX_SIZE_MB } from './utils/claimFormUtils'
import { Trash2 } from 'lucide-react'

const ClaimSubmissionEditorCard = ({
  isExceptionalClaim,
  claimCategoryOptions,
  categoryGuidance,
  draftItem,
  editingIndex,
  onUpdateDraftItem,
  onAttachmentChange,
  onClearAttachment,
  onResetDraft,
  onCancelAddItem,
  onSaveItem,
}) => {
  const schema = buildExpenseClaimEditorSchema({
    isExceptionalClaim,
    draftItem,
    categoryGuidance,
  })
  const hasSection = (key) => schema.fieldSections.some((section) => section.key === key)

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span>
            {editingIndex !== null
              ? `Edit Item ${editingIndex + 1}`
              : isExceptionalClaim
                ? 'Exceptional Claim Form'
                : 'Claim Item Form'}
          </span>
          {editingIndex !== null && <CBadge color="info">Edit Mode</CBadge>}
        </div>
        {editingIndex !== null && (
          <CButton color="light" size="sm" onClick={onResetDraft}>
            Cancel edit
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol xs={12}>
            <div className="small text-uppercase text-body-secondary fw-semibold">1. Category</div>
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="draft-category">{schema.categoryLabel}</CFormLabel>
            <CFormSelect
              id="draft-category"
              value={draftItem.category}
              onChange={(e) => onUpdateDraftItem({ category: e.target.value })}
            >
              {claimCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12}>
            <div className="small rounded-2 border px-3 py-2 text-body-secondary bg-light">
              {schema.helperText}
            </div>
          </CCol>
          {isExceptionalClaim && (
            <CCol xs={12}>
              <div className="small rounded-2 border border-warning-subtle px-3 py-2 text-body-secondary bg-warning bg-opacity-10">
                Exceptional claims are for approved policy exceptions only. Do not use this form for
                salary incentives/allowances or normal operating expenses.
              </div>
            </CCol>
          )}

          <CCol xs={12}>
            <div className="small text-uppercase text-body-secondary fw-semibold">
              2. Claim Details
            </div>
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="draft-expense-date">{schema.dateLabel}</CFormLabel>
            <CFormInput
              id="draft-expense-date"
              type="date"
              value={draftItem.expenseDate}
              onChange={(e) => onUpdateDraftItem({ expenseDate: e.target.value })}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel htmlFor="draft-amount">Amount (MYR)</CFormLabel>
            <CFormInput
              id="draft-amount"
              type="number"
              min="0"
              step="0.01"
              value={draftItem.amount}
              disabled={schema.amountDisabled}
              onChange={(e) => onUpdateDraftItem({ amount: e.target.value })}
            />
          </CCol>

          {schema.hasCategorySpecificFields && (
            <CCol xs={12}>
              <div className="small text-uppercase text-body-secondary fw-semibold">
                3. Category Details
              </div>
            </CCol>
          )}

          {hasSection('mileage') && (
            <>
              <CCol md={3}>
                <CFormLabel htmlFor="draft-from-location">From</CFormLabel>
                <CFormInput
                  id="draft-from-location"
                  value={draftItem.fromLocation}
                  onChange={(e) => onUpdateDraftItem({ fromLocation: e.target.value })}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="draft-to-location">To</CFormLabel>
                <CFormInput
                  id="draft-to-location"
                  value={draftItem.toLocation}
                  onChange={(e) => onUpdateDraftItem({ toLocation: e.target.value })}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="draft-distance">Distance (KM)</CFormLabel>
                <CFormInput
                  id="draft-distance"
                  type="number"
                  min="0"
                  step="0.1"
                  value={draftItem.distanceKm}
                  onChange={(e) => onUpdateDraftItem({ distanceKm: e.target.value })}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="draft-rate">Rate / KM</CFormLabel>
                <CFormInput
                  id="draft-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftItem.ratePerKm}
                  onChange={(e) => onUpdateDraftItem({ ratePerKm: e.target.value })}
                />
              </CCol>
            </>
          )}

          {hasSection('travel') && (
            <>
              <CCol md={4}>
                <CFormLabel htmlFor="draft-destination">Destination</CFormLabel>
                <CFormInput
                  id="draft-destination"
                  value={draftItem.destination}
                  onChange={(e) => onUpdateDraftItem({ destination: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="draft-trip-from">Trip From</CFormLabel>
                <CFormInput
                  id="draft-trip-from"
                  type="date"
                  value={draftItem.tripDateFrom}
                  onChange={(e) => onUpdateDraftItem({ tripDateFrom: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="draft-trip-to">Trip To</CFormLabel>
                <CFormInput
                  id="draft-trip-to"
                  type="date"
                  value={draftItem.tripDateTo}
                  onChange={(e) => onUpdateDraftItem({ tripDateTo: e.target.value })}
                />
              </CCol>
            </>
          )}

          {hasSection('billing') && (
            <CCol md={4}>
              <CFormLabel htmlFor="draft-billed-period">Billing Period</CFormLabel>
              <CFormInput
                id="draft-billed-period"
                placeholder="e.g. Mar 2026"
                value={draftItem.billedPeriod}
                onChange={(e) => onUpdateDraftItem({ billedPeriod: e.target.value })}
              />
            </CCol>
          )}

          {hasSection('medical') && (
            <CCol md={4}>
              <CFormLabel htmlFor="draft-claimant">Claimant</CFormLabel>
              <CFormSelect
                id="draft-claimant"
                value={draftItem.claimant}
                onChange={(e) => onUpdateDraftItem({ claimant: e.target.value })}
              >
                <option value="Self">Self</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
              </CFormSelect>
            </CCol>
          )}

          {hasSection('exceptional') && (
            <CCol xs={12}>
              <CFormLabel htmlFor="draft-approval-note">Approval Note</CFormLabel>
              <CFormInput
                id="draft-approval-note"
                placeholder="Reference approval memo, approver name, and approval date"
                value={draftItem.approvalNote}
                onChange={(e) => onUpdateDraftItem({ approvalNote: e.target.value })}
              />
            </CCol>
          )}

          <CCol xs={12}>
            <div className="small text-uppercase text-body-secondary fw-semibold">
              {schema.hasCategorySpecificFields
                ? '4. Attachment and Notes'
                : '3. Attachment and Notes'}
            </div>
          </CCol>
          <CCol md={12} data-tour-id="payroll-claim-attachments">
            <CFormLabel htmlFor="draft-attachment">
              {isExceptionalClaim ? 'Attachment (Required)' : 'Attachment'}
            </CFormLabel>
            <CFormInput
              id="draft-attachment"
              type="file"
              accept={PAYROLL_ATTACHMENT_ACCEPT}
              onChange={(e) => onAttachmentChange(e.target.files?.[0] || null)}
            />
            <div className="small text-body-secondary mt-1">
              {draftItem.attachmentName
                ? `Attached: ${draftItem.attachmentName}${
                    draftItem.attachmentUploadState === 'uploading'
                      ? ' (Uploading...)'
                      : draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach
                        ? ' (Reattach required)'
                        : ''
                  }`
                : `${schema.attachmentHint} Accepted: PDF, JPG, JPEG, PNG up to ${PAYROLL_ATTACHMENT_MAX_SIZE_MB} MB.`}
            </div>
            {draftItem.attachmentError ? (
              <div className="small text-danger mt-1">{draftItem.attachmentError}</div>
            ) : null}
            {draftItem.attachmentName && (
              <div className="mt-2">
                <CButton
                  color="light"
                  size="sm"
                  type="button"
                  className="d-inline-flex align-items-center gap-1"
                  onClick={onClearAttachment}
                >
                  <Trash2 size={14} />
                  <span>Remove attachment</span>
                </CButton>
              </div>
            )}
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="draft-line-notes">
              {isExceptionalClaim ? 'Detailed Justification' : 'Item Notes'}
            </CFormLabel>
            <CFormTextarea
              id="draft-line-notes"
              rows={2}
              placeholder={schema.notesPlaceholder}
              value={draftItem.lineNotes}
              onChange={(e) => onUpdateDraftItem({ lineNotes: e.target.value })}
            />
          </CCol>
        </CRow>

        <div className="d-flex flex-column flex-md-row justify-content-end gap-2 mt-4">
          {editingIndex !== null && (
            <CButton color="light" onClick={onResetDraft}>
              Cancel edit
            </CButton>
          )}
          {editingIndex === null && (
            <CButton color="light" onClick={onCancelAddItem}>
              Cancel add item
            </CButton>
          )}
          <CButton color="primary" onClick={onSaveItem}>
            {editingIndex !== null ? 'Update Item' : 'Save Item'}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default ClaimSubmissionEditorCard
