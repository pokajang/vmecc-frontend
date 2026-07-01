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
import { recordTypeUsage } from './typeUsageStorage'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'

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

const ErcoMobileHome = ({
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
  const incident = useIncidentTypeManager({
    userId: user?.id,
    selectedType: '',
    updateSetupField: () => {},
    pushToast,
  })

  const typeOptions = useMemo(() => {
    const toggleIcon = incident.showAllIncidentTypes ? ChevronUp : ChevronDown
    return incident.visibleTypeOptions.map((option) =>
      option?.value === INCIDENT_TYPE_TOGGLE_VALUE ? { ...option, icon: toggleIcon } : option,
    )
  }, [incident.showAllIncidentTypes, incident.visibleTypeOptions])
  const draftRecordItems = draftRows.map((draft) => ({
    key: draft.recordKey || draft.id,
    layout: 'compact',
    title: 'Continue Draft',
    subtitle: `${draft.incidentType || 'ERCO'} - ${draft.location || 'No location'}`,
    status: (
      <div className="small text-body-secondary text-nowrap">
        {formatMobileReportDate(draft, 'Saved')}
      </div>
    ),
    ariaLabel: `Continue ERCO draft ${draft.recordKey || draft.id || ''}`.trim(),
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
    ariaLabel: `Open ERCO record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div className="d-md-none d-grid gap-3 mb-3" data-tour-id="erco-report-mobile-home">
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        tourId="erco-report-type-manager-delete-modal"
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
          if (deleteTypeTarget?.value) incident.removeType(deleteTypeTarget.value)
          setDeleteTypeTarget(null)
        }}
      />

      <TypeManagerModal
        visible={incident.showAddTypeModal}
        tourId="erco-report-type-manager-modal"
        onClose={incident.closeAddModal}
        editMode={incident.incidentEditMode}
        onSetEditMode={incident.setIncidentEditMode}
        editTitle="Edit Emergency / Incident Types"
        addTitle="Add Emergency / Incident Type"
        options={incident.typeOptions}
        onStartEdit={incident.startEditType}
        onRequestDelete={({ value, label }) => setDeleteTypeTarget({ value, label })}
        nameLabel="Emergency / Incident Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(value) => {
          incident.setNewTypeName(value)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Flood Response"
        descriptionLabel="Emergency / Incident Details (Optional)"
        descriptionValue={incident.newTypeDescription}
        onChangeDescription={incident.setNewTypeDescription}
        descriptionPlaceholder="One-line subtext for this card."
        error={incident.addTypeError}
        editingKey={incident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={incident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={incident.iconOptions}
        iconValue={incident.newTypeIconKey}
        onChangeIcon={incident.setNewTypeIconKey}
        showIconPicker
      />

      <div className="d-grid gap-3 mb-2" data-tour-id="erco-report-mobile-type-selection">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold text-muted">Choose Emergency / Incident Type</div>
          <CreateActionButton label="Add type" onClick={incident.openAddModal} />
        </div>
        <IconOptionGrid
          options={typeOptions}
          value=""
          onChange={(nextValue) => {
            if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
              incident.setShowAllIncidentTypes((prev) => !prev)
              return
            }
            const value = String(nextValue || '').trim()
            if (!value) return
            recordTypeUsage(user?.id, 'incident', value)
            onSelectType?.(value)
          }}
          variant="compact"
          showDescription={false}
          columns={{ xs: 6 }}
          cardProps={(option) =>
            option?.value === INCIDENT_TYPE_TOGGLE_VALUE ? TOGGLE_CARD_PROPS : {}
          }
        />
      </div>

      {draftRows.length > 0 ? (
        <MobileRecordList
          sections={[{ key: 'erco-drafts', items: draftRecordItems }]}
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
          sections={[{ key: 'recent-erco-records', items: recentRecordItems }]}
          variant="list-group"
        />
      ) : (
        <div className="border rounded-3 bg-white p-3 text-body-secondary">No records yet.</div>
      )}
    </div>
  )
}

export default ErcoMobileHome
