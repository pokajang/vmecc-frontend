import React, { useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import ButtonLoader from 'src/components/ButtonLoader'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import { formatMobileReportDate } from '../reportUiUtils'
import useDrillTypeManager, { DRILL_TYPE_TOGGLE_VALUE } from './useDrillTypeManager'
import { recordDrillTypeUsage } from './typeUsageStorage'

const TOGGLE_CARD_PROPS = {
  style: {
    backgroundColor: 'var(--cui-light-bg-subtle, #f8f9fa)',
    borderColor: 'var(--cui-border-color, #d8dbe0)',
    borderStyle: 'dashed',
  },
  className: 'text-primary',
  iconContainerClassName: 'bg-white text-primary',
  titleClassName: 'fw-semibold text-primary',
  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
}

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
  const draftRecordItems = draftRows.map((draft) => ({
    key: draft.recordKey || draft.id,
    layout: 'compact',
    title: 'Continue Draft',
    subtitle: `${draft.incidentType || 'Drill'} - ${draft.location || 'No location'}`,
    status: (
      <div className="small text-body-secondary text-nowrap">
        {formatMobileReportDate(draft, 'Saved')}
      </div>
    ),
    ariaLabel: `Continue drill draft ${draft.recordKey || draft.id || ''}`.trim(),
    onOpen: () => onContinueDraft?.(draft),
    actions: (
      <CButton
        type="button"
        color="link"
        size="sm"
        className="inspection-draft-delete-btn p-1 text-danger shadow-none border-0"
        aria-label="Delete draft"
        onClick={() => onDeleteDraft?.(draft)}
      >
        <Trash2 size={15} />
      </CButton>
    ),
  }))
  const recentRecordItems = recentRecords.map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.incidentType || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <div className="text-end">
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </div>
    ),
    ariaLabel: `Open drill record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div className="d-md-none d-grid gap-3 mb-3" data-tour-id="drill-report-mobile-home">
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        tourId="drill-report-type-manager-delete-modal"
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
        tourId="drill-report-type-manager-modal"
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
        descriptionLabel="Drill Type Details (Optional)"
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

      <div className="d-grid gap-3 mb-2" data-tour-id="drill-report-mobile-type-selection">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold text-muted">Choose Drill Type</div>
          <CreateActionButton label="Add type" onClick={drillType.openAddModal} />
        </div>
        <IconOptionGrid
          options={typeOptions}
          value=""
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
          variant="compact"
          showDescription={false}
          columns={{ xs: 6 }}
          cardProps={(option) =>
            option?.value === DRILL_TYPE_TOGGLE_VALUE ? TOGGLE_CARD_PROPS : {}
          }
        />
      </div>

      {draftRows.length > 0 ? (
        <MobileRecordList
          sections={[{ key: 'drill-drafts', items: draftRecordItems }]}
          variant="list-group"
        />
      ) : null}

      <div className="d-grid gap-2 mb-1">
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl value={recordScope} onChange={onRecordScopeChange} />
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-view-all-btn d-inline-flex align-items-center"
            disabled={isRecordsLoading}
            onClick={onViewRecords}
          >
            View all
            {recordsCount ? ` (${recordsCount})` : ''}
          </CButton>
        </div>
      </div>

      {isRecordsLoading ? (
        <div className="border rounded-3 bg-white">
          <ButtonLoader label="Loading records..." />
        </div>
      ) : recentRecords.length > 0 ? (
        <MobileRecordList
          sections={[{ key: 'recent-drill-records', items: recentRecordItems }]}
          variant="list-group"
        />
      ) : (
        <div className="border rounded-3 bg-white p-3 text-body-secondary">No records yet.</div>
      )}
    </div>
  )
}

export default DrillMobileHome
