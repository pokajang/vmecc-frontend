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
import { recordTypeUsage } from './typeUsageStorage'
import useIncidentTypeManager, { INCIDENT_TYPE_TOGGLE_VALUE } from './useIncidentTypeManager'
import { REPORT_MOBILE_QUERY } from '../hooks/useReportIsMobile'

const MOBILE_HOME_RECENT_RECORD_LIMIT = 3

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
  const draftRow = draftRows[0] || null
  const draftSyncStatus = String(draftRow?.syncStatus || draftRow?.__offlineSyncStatus || '').trim()
  const draftSummary = draftRow
    ? [draftRow.incidentType || 'ERCO', draftRow.location || 'No location']
        .filter(Boolean)
        .join(' - ')
    : ''
  const recentRecordItems = recentRecords.slice(0, MOBILE_HOME_RECENT_RECORD_LIMIT).map((row) => ({
    key: row.recordKey || row.id,
    layout: 'compact',
    title: row.incidentType || 'Record',
    subtitle: row.location || 'No location',
    status: (
      <>
        <div className="small fw-semibold text-nowrap">{row.status || '--'}</div>
        <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
      </>
    ),
    ariaLabel: `Open ERCO record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="mobile-workflow-home d-md-none d-grid gap-3 mb-3"
      data-testid="erco-report-mobile-home"
    >
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="erco-report-type-manager-delete-modal"
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
        mobileDrawer
        mobileDrawerQuery={REPORT_MOBILE_QUERY}
        testId="erco-report-type-manager-modal"
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
        descriptionLabel="Emergency / incident details (optional)"
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

      <MobileTypeSelectionSection
        title="Choose type"
        data-testid="erco-report-mobile-type-selection"
        headerAction={
          <CreateActionButton
            label="Add type"
            className="mobile-workflow-home__compact-action"
            onClick={incident.openAddModal}
          />
        }
        options={typeOptions}
        toggleValue={INCIDENT_TYPE_TOGGLE_VALUE}
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
      />

      {draftRow ? (
        <MobileWorkflowDraftCard
          ariaLabel="Continue ERCO draft"
          summary={draftSummary}
          savedLabel={formatMobileReportDate(draftRow, 'Saved')}
          syncStatus={draftSyncStatus}
          onContinue={() => onContinueDraft?.(draftRow)}
          onDelete={() => onDeleteDraft?.(draftRow)}
        />
      ) : null}

      <MobileRecentRecordsSection
        testId="erco-report-mobile-records"
        recordScope={recordScope}
        onRecordScopeChange={onRecordScopeChange}
        scopeProps={{ 'data-testid': 'erco-report-scope' }}
        recordsCount={recordsCount}
        items={recentRecordItems}
        sectionKey="recent-erco-records"
        isLoading={isRecordsLoading}
        onViewRecords={onViewRecords}
      />
    </div>
  )
}

export default ErcoMobileHome
