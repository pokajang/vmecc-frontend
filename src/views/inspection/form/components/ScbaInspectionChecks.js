import React, { useMemo, useState } from 'react'
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
import { InspectionMobileCollapsedSelectorRow } from './InspectionSetupSelectorControls'

export const ScbaInspectionChecks = ({
  mainLocation,
  form,
  summary,
  onUpdateGroupedCheck,
  onSaveGroupedRowDraft,
  onResetGroupedCheck,
  onMarkRowOk,
  onMarkGroupOk,
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
  isLoadingRows = false,
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
  const [selectedSectionKey, setSelectedSectionKey] = useState('')
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
  const selectedSection = useMemo(
    () => visibleSections.find((section) => section.key === selectedSectionKey) || null,
    [selectedSectionKey, visibleSections],
  )
  const selectedFilteredSection = useMemo(() => {
    if (!selectedSection) return null
    return (
      filteredSections.find((section) => section.key === selectedSection.key) || {
        ...selectedSection,
        visibleRows: [],
      }
    )
  }, [filteredSections, selectedSection])
  const displaySections = readOnly
    ? filteredSections
    : selectedFilteredSection
      ? [selectedFilteredSection]
      : []

  const getNextIncompleteSection = () => {
    const sectionsForSearch = filteredSections
    if (readOnly || !selectedSection) return sectionsForSearch

    const currentIndex = sectionsForSearch.findIndex(
      (section) => section.key === selectedSection.key,
    )
    if (currentIndex === -1) return sectionsForSearch
    return sectionsForSearch.slice(currentIndex)
  }

  const isCompactViewport = isCompactInspectionViewport()

  const isScbaRowIncomplete = (section, row = {}) => {
    const fields = section.fields || getScbaSectionFields(section.key, form)
    const hasMissingValue = fields.some((field) => !String(row[field.key] || '').trim())
    const hasIncompleteIssueEvidence = fields.some((field) => {
      if (field.kind !== 'status' || String(row[field.key] || '') !== 'Not Good') return false
      const { remarksKey } = getScbaFieldEvidenceKeys(field)
      return !String(row[remarksKey] || '').trim()
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

  const selectSection = (sectionKey) => {
    setSelectedSectionKey(sectionKey)
    setSearch('')
    const normalizedSectionKey = String(sectionKey || '').trim()
    if (!normalizedSectionKey) {
      setHasManualSectionExpansion(false)
      setExpandedSectionKeys(new Set())
      return
    }

    setHasManualSectionExpansion(true)
    setExpandedSectionKeys(new Set([normalizedSectionKey]))
  }

  const resetSelectedSection = () => {
    setSelectedSectionKey('')
    setSearch('')
    setHasManualSectionExpansion(false)
    setExpandedSectionKeys(new Set())
  }

  const renderSectionSelector = () => {
    if (readOnly) return null

    if (selectedSection && isCompactViewport) {
      return (
        <InspectionMobileCollapsedSelectorRow
          label="Group"
          value={selectedSection.title}
          resetLabel="Reset group"
          editLabel="Change group"
          onReset={resetSelectedSection}
          onEdit={resetSelectedSection}
        />
      )
    }

    return (
      <div className="d-grid gap-3">
        <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold text-muted">
            {selectedSection ? 'Groups' : 'Choose Group'}
          </div>
          <CreateActionButton
            label="Add section"
            className="inspection-compact-action-btn"
            onClick={onAddSection}
          />
        </div>
        {visibleSections.length > 0 ? (
          <div className="row g-3">
            {visibleSections.map((section) => {
              const isSelected = selectedSectionKey === section.key
              const rowCount = (section.visibleRows || []).length
              return (
                <div key={section.key} className="col-12 col-md-6 col-xl-4">
                  <button
                    type="button"
                    className={`inspection-location-option-card w-100 rounded-3 border bg-body p-3 text-start${
                      isSelected ? ' border-primary shadow-sm' : ''
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => selectSection(section.key)}
                  >
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div className="fw-semibold text-break">{section.title}</div>
                      <span className="small text-body-secondary">
                        {rowCount} item{rowCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="small text-body-secondary mt-1">
                      {section.checkedCount || 0}/{rowCount} checked
                      {section.issueCount ? ` | ${section.issueCount} issue(s)` : ''}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
            No SCBA groups have items for this main location.
          </div>
        )}
      </div>
    )
  }

  if (!mainLocation && visibleSections.every((section) => section.visibleRows.length === 0)) {
    return null
  }

  return (
    <div className="d-grid gap-3">
      {renderSectionSelector()}

      {readOnly || selectedSection ? (
        <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-muted">
              {selectedSection ? `${selectedSection.title} Items` : 'SCBA Items'}
            </div>
          </div>
          {!readOnly && selectedSection ? (
            <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
              <CreateActionButton
                label="Mark group Good"
                className="inspection-compact-action-btn d-none d-md-inline-flex"
                onClick={() => onMarkGroupOk?.(selectedSection.key)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {readOnly || selectedSection ? (
        <ManagedCheckToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search SCBA items..."
          resultCount={displaySections.reduce(
            (count, section) => count + section.visibleRows.length,
            0,
          )}
          totalCount={selectedSection ? (selectedSection.visibleRows || []).length : totalRowCount}
          readOnly={readOnly}
          onNextIncomplete={() => {
            const sectionSearchPath = getNextIncompleteSection()
            const section = sectionSearchPath.find((candidate) =>
              (candidate.visibleRows || []).some((row) => isScbaRowIncomplete(candidate, row)),
            )
            if (!section) return

            if (section.key !== selectedSectionKey) {
              selectSection(section.key)
            }
            expandScbaSection(section.key)
          }}
          onExpandAll={() => {
            setHasManualSectionExpansion(true)
            setExpandedSectionKeys(new Set(displaySections.map((section) => section.key)))
          }}
          onCollapseAll={() => {
            setHasManualSectionExpansion(true)
            setExpandedSectionKeys(new Set())
          }}
        />
      ) : null}

      {isLoadingRows ? (
        <div className="small text-body-secondary" aria-live="polite">
          Refreshing SCBA equipment...
        </div>
      ) : null}

      {readOnly || selectedSection ? (
        <>
          <ScbaSectionCards
            filteredSections={displaySections}
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
        </>
      ) : null}

      {!readOnly ? (
        <>
          <FormFieldError>
            {fieldError ? 'Complete all SCBA rows before review.' : ''}
          </FormFieldError>
          <FormFieldError>
            {remarksError ? 'Add remarks for SCBA issue fields before review.' : ''}
          </FormFieldError>
        </>
      ) : null}
      <InspectionPhotoViewerModal viewer={photoViewer} onClose={() => setPhotoViewer(null)} />
    </div>
  )
}
