import React, { useState } from 'react'
import CreateActionButton from 'src/components/CreateActionButton'
import {
  getScbaFieldEvidenceKeys,
  getScbaSectionFields,
  normalizeScbaCustomSections,
  SCBA_SECTION_DEFINITIONS,
  SCBA_STATUS_OPTIONS,
} from 'src/views/inspection/types/scba/helpers'
import {
  FormFieldError,
  InspectionPhotoViewerModal,
  ManagedCheckToolbar,
  isCompactInspectionViewport,
  rowContainsSearch,
} from './InspectionDisplayShared'
import ScbaSectionCards from './ScbaSectionCards'

export const ScbaInspectionChecks = ({
  mainLocation,
  form,
  summary,
  onUpdateGroupedCheck,
  onSaveGroupedRowDraft,
  onResetGroupedCheck,
  onMarkRowOk,
  onMarkAllOk,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onArchiveSection,
  onRestoreSection,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onArchiveItem,
  onRestoreItem,
  onRequestPhotoUpload,
  onRequestIssuePhotoUpload,
  onRemovePhoto,
  onChangePhotoDescription,
  onApplyPhotoCaption,
  fieldError = false,
  remarksError = false,
  readOnly = false,
}) => {
  const visibleSections =
    summary?.visibleSections ||
    SCBA_SECTION_DEFINITIONS.map((section) => ({
      ...section,
      visibleRows: [],
      checkedCount: 0,
      issueCount: 0,
      incompleteRemarksCount: 0,
    }))
  const [search, setSearch] = useState('')
  const [expandedSectionKeys, setExpandedSectionKeys] = useState(() => new Set())
  const [hasManualSectionExpansion, setHasManualSectionExpansion] = useState(false)
  const [photoViewer, setPhotoViewer] = useState(null)
  const filteredSections = visibleSections
    .map((section) => ({
      ...section,
      visibleRows: (section.visibleRows || []).filter((row) =>
        rowContainsSearch(
          row,
          [
            'brand',
            'serialNo',
            'size',
            'cylinderType',
            'remarks',
            ...(section.fields || getScbaSectionFields(section.key, form)).map(
              (field) => field.key,
            ),
          ],
          search,
        ),
      ),
    }))
    .filter((section) => !search || section.visibleRows.length > 0)
  const filteredRowCount = filteredSections.reduce(
    (count, section) => count + section.visibleRows.length,
    0,
  )
  const totalRowCount = visibleSections.reduce(
    (count, section) => count + (section.visibleRows || []).length,
    0,
  )
  const shouldDefaultCollapseSections = isCompactInspectionViewport()
  const removedCustomSections = normalizeScbaCustomSections(
    form?.scbaCustomSections || form?.scba_custom_sections,
  )
    .map((section) => ({
      ...section,
      removedRows: (section.rows || []).filter((row) => row.removed === true),
    }))
    .filter((section) => section.removed === true || section.removedRows.length > 0)
  const defaultExpandedSectionKeys = new Set(
    shouldDefaultCollapseSections
      ? filteredSections.slice(0, 1).map((section) => section.key)
      : filteredSections.map((section) => section.key),
  )

  const isScbaRowIncomplete = (section, row = {}) => {
    const fields = section.fields || getScbaSectionFields(section.key, form)
    const hasMissingValue = fields.some((field) => !String(row[field.key] || '').trim())
    const hasIncompleteIssueEvidence = fields.some((field) => {
      if (field.kind !== 'status' || String(row[field.key] || '') !== 'Not Good') return false
      const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
      const photos = Array.isArray(row[photosKey]) ? row[photosKey] : []
      return !String(row[remarksKey] || '').trim() || photos.length === 0
    })
    return hasMissingValue || hasIncompleteIssueEvidence
  }

  const expandScbaSection = (sectionKey) => {
    const normalizedKey = String(sectionKey || '').trim()
    if (!normalizedKey) return
    setHasManualSectionExpansion(true)
    setExpandedSectionKeys((current) => {
      const next = hasManualSectionExpansion
        ? new Set(current)
        : new Set(defaultExpandedSectionKeys)
      next.add(normalizedKey)
      return next
    })
    window.setTimeout(() => {
      Array.from(document.querySelectorAll('[data-inspection-scba-section-id]'))
        .find(
          (element) => element.getAttribute('data-inspection-scba-section-id') === normalizedKey,
        )
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  if (!mainLocation && visibleSections.every((section) => section.visibleRows.length === 0)) {
    return null
  }

  return (
    <div className="d-grid gap-3">
      <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">SCBA Items</div>
        </div>
        {!readOnly ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CreateActionButton
              label="Mark all Good"
              className="inspection-compact-action-btn d-none d-md-inline-flex"
              onClick={onMarkAllOk}
            />
            <CreateActionButton
              label="Add section"
              className="inspection-compact-action-btn"
              onClick={onAddSection}
            />
          </div>
        ) : null}
      </div>

      <ManagedCheckToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search SCBA items..."
        resultCount={filteredRowCount}
        totalCount={totalRowCount}
        readOnly={readOnly}
        onNextIncomplete={() => {
          const section = filteredSections.find((candidate) =>
            (candidate.visibleRows || []).some((row) => isScbaRowIncomplete(candidate, row)),
          )
          if (section) expandScbaSection(section.key)
        }}
        onExpandAll={() => {
          setHasManualSectionExpansion(true)
          setExpandedSectionKeys(new Set(filteredSections.map((section) => section.key)))
        }}
        onCollapseAll={() => {
          setHasManualSectionExpansion(true)
          setExpandedSectionKeys(new Set())
        }}
      />

      <ScbaSectionCards
        filteredSections={filteredSections}
        removedCustomSections={removedCustomSections}
        readOnly={readOnly}
        form={form}
        remarksError={remarksError}
        expandedSectionKeys={expandedSectionKeys}
        hasManualSectionExpansion={hasManualSectionExpansion}
        defaultExpandedSectionKeys={defaultExpandedSectionKeys}
        setExpandedSectionKeys={setExpandedSectionKeys}
        setHasManualSectionExpansion={setHasManualSectionExpansion}
        setPhotoViewer={setPhotoViewer}
        statusOptions={SCBA_STATUS_OPTIONS}
        onUpdateGroupedCheck={onUpdateGroupedCheck}
        onSaveGroupedRowDraft={onSaveGroupedRowDraft}
        onResetGroupedCheck={onResetGroupedCheck}
        onMarkRowOk={onMarkRowOk}
        onEditSection={onEditSection}
        onDeleteSection={onDeleteSection}
        onArchiveSection={onArchiveSection}
        onAddItem={onAddItem}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onArchiveItem={onArchiveItem}
        onRequestPhotoUpload={onRequestPhotoUpload}
        onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
        onRemovePhoto={onRemovePhoto}
        onChangePhotoDescription={onChangePhotoDescription}
        onApplyPhotoCaption={onApplyPhotoCaption}
        onRestoreSection={onRestoreSection}
        onRestoreItem={onRestoreItem}
      />

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all SCBA rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError
              ? 'Add remarks and issue photos for SCBA issue fields before review.'
              : ''}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}
