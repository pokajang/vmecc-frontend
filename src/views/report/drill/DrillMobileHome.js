import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import {
  MobileRecentRecordsSection,
  MobileTypeSelectionSection,
  MobileWorkflowDraftCard,
} from 'src/components/report-workflow/mobile-home'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { formatMobileReportDate } from '../reportUiUtils'
import { REPORT_MOBILE_QUERY } from '../hooks/useReportIsMobile'
import useDrillTypeManager, { DRILL_TYPE_TOGGLE_VALUE } from './useDrillTypeManager'
import { recordDrillTypeUsage } from './typeUsageStorage'

const MOBILE_HOME_RECENT_RECORD_LIMIT = 3

const DrillMobileHome = ({
  user,
  draftRows = [],
  recentRecords = [],
  recordsCount = 0,
  recordScope,
  onRecordScopeChange,
  isRecordsLoading = false,
  onSelectType,
  onContinueDraft,
  onDeleteDraft,
  onOpenRecord,
  onViewRecords,
  pushToast,
}) => {
  const [deleteTypeTarget, setDeleteTypeTarget] = useState(null)
  const drillType = useDrillTypeManager({
    userId: user?.id,
    selectedType: '',
    updateSetupField: () => {},
    pushToast,
  })

  const typeOptions = useMemo(() => {
    const toggleIcon = drillType.showAllDrillTypes ? ChevronUp : ChevronDown
    return drillType.visibleTypeOptions.map((option) =>
      option?.value === DRILL_TYPE_TOGGLE_VALUE ? { ...option, icon: toggleIcon } : option,
    )
  }, [drillType.showAllDrillTypes, drillType.visibleTypeOptions])
  const draftRow = draftRows[0] || null
  const draftSyncStatus = String(draftRow?.syncStatus || draftRow?.__offlineSyncStatus || '').trim()
  const draftSummary = draftRow
    ? [
        draftRow.exerciseTitle || draftRow.incidentType || 'Drill',
        draftRow.location || 'No location',
      ]
        .filter(Boolean)
        .join(' - ')
    : ''
  const recentRecordItems = recentRecords.slice(0, MOBILE_HOME_RECENT_RECORD_LIMIT).map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.exerciseTitle || row.incidentType || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </>
    ),
    ariaLabel: `Open drill record ${row.exerciseTitle || row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="mobile-workflow-home d-md-none d-grid gap-3 mb-3"
      data-testid="drill-report-mobile-home"
    >
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-type-manager-delete-modal"
        title="Delete Type"
        message={
          deleteTypeTarget?.label
            ? `Delete "${deleteTypeTarget.label}"? This cannot be undone.`
            : 'Delete this type?'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={() => setDeleteTypeTarget(null)}
        onConfirm={() => {
          if (deleteTypeTarget?.value) drillType.removeType(deleteTypeTarget.value)
          setDeleteTypeTarget(null)
        }}
      />

      <TypeManagerModal
        visible={drillType.showAddTypeModal}
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="drill-report-type-manager-modal"
        onClose={drillType.closeAddModal}
        editMode={drillType.drillTypeEditMode}
        onSetEditMode={drillType.setDrillTypeEditMode}
        editTitle="Edit Drill Types"
        addTitle="Add Drill Type"
        options={drillType.typeOptions}
        onStartEdit={drillType.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTypeTarget({ value, label })}
        nameLabel="Drill Type Name"
        nameValue={drillType.newTypeName}
        onChangeName={(value) => {
          drillType.setNewTypeName(value)
          if (drillType.addTypeError) drillType.setAddTypeError('')
        }}
        namePlaceholder="e.g. Confined Space Drill"
        descriptionLabel="Drill type details (optional)"
        descriptionValue={drillType.newTypeDescription}
        onChangeDescription={drillType.setNewTypeDescription}
        descriptionPlaceholder="One-line subtext for this card."
        error={drillType.addTypeError}
        editingKey={drillType.editingDrillTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={drillType.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={drillType.iconOptions}
        iconValue={drillType.newTypeIconKey}
        onChangeIcon={drillType.setNewTypeIconKey}
        showIconPicker
      />

      <MobileTypeSelectionSection
        title="Choose type"
        data-testid="drill-report-mobile-type-selection"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="mobile-workflow-home__compact-action"
            onClick={drillType.openAddModal}
          />
        }
        options={typeOptions}
        toggleValue={DRILL_TYPE_TOGGLE_VALUE}
        onChange={(nextValue) => {
          if (nextValue === DRILL_TYPE_TOGGLE_VALUE) {
            drillType.setShowAllDrillTypes((prev) => !prev)
            return
          }
          const value = String(nextValue || '').trim()
          if (!value) return
          recordDrillTypeUsage(user?.id, value)
          onSelectType?.(value)
        }}
      />

      {draftRow ? (
        <MobileWorkflowDraftCard
          ariaLabel="Continue drill draft"
          summary={draftSummary}
          savedLabel={formatMobileReportDate(draftRow, 'Saved')}
          syncStatus={draftSyncStatus}
          onContinue={() => onContinueDraft?.(draftRow)}
          onDelete={() => onDeleteDraft?.(draftRow)}
        />
      ) : null}

      <MobileRecentRecordsSection
        testId="drill-report-mobile-records"
        recordScope={recordScope}
        onRecordScopeChange={onRecordScopeChange}
        recordsCount={recordsCount}
        items={recentRecordItems}
        sectionKey="recent-drill-records"
        isLoading={isRecordsLoading}
        onViewRecords={onViewRecords}
      />
    </div>
  )
}

export default DrillMobileHome
