import React, { useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import MobileRecordList from 'src/components/MobileRecordList'
import PageState from 'src/components/PageState'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import TableLoader from 'src/components/TableLoader'
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
  iconContainerClassName: 'bg-body text-primary',
  titleClassName: 'fw-semibold text-primary',
  descriptionClassName: 'mb-0 mt-1 text-body-secondary',
}

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
    ? [draftRow.incidentType || 'Drill', draftRow.location || 'No location']
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
    ariaLabel: `Open drill record ${row.incidentType || 'Record'} ${
      row.location || 'No location'
    } summary`,
    onOpen: () => onOpenRecord?.(row),
  }))

  return (
    <div
      className="inspection-mobile-home d-md-none d-grid gap-3 mb-3"
      data-testid="drill-report-mobile-home"
    >
      <ActionConfirmModal
        visible={Boolean(deleteTypeTarget)}
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

      <div
        className="inspection-mobile-home__section d-grid gap-3 mb-2"
        data-testid="drill-report-mobile-type-selection"
      >
        <div className="inspection-mobile-home__section-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-semibold text-muted">Choose Type</div>
          <CreateActionButton
            label="Add type"
            className="inspection-compact-action-btn"
            onClick={drillType.openAddModal}
          />
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
          columns={{ xs: 12 }}
          rowClassName="inspection-mobile-home__type-grid g-2 mx-0"
          cardProps={(option) =>
            option?.value === DRILL_TYPE_TOGGLE_VALUE ? TOGGLE_CARD_PROPS : {}
          }
        />
      </div>

      {draftRow ? (
        <div className="inspection-mobile-home__draft-list list-group list-group-flush overflow-hidden border rounded-3">
          <article
            className="inspection-draft-card list-group-item p-3 bg-body cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Continue drill draft"
            onClick={() => onContinueDraft?.(draftRow)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onContinueDraft?.(draftRow)
            }}
          >
            <div className="inspection-draft-card__grid">
              <div className="inspection-draft-card__main">
                <div className="inspection-draft-card__eyebrow">Draft in progress</div>
                <div className="inspection-draft-card__summary small text-body-secondary">
                  <span className="fw-semibold text-body">Continue Draft</span>
                  {draftSummary ? (
                    <span className="inspection-draft-card__summary-detail"> {draftSummary}</span>
                  ) : null}
                </div>
                <div className="inspection-draft-card__date small text-body-secondary">
                  {formatMobileReportDate(draftRow, 'Saved')}
                </div>
              </div>
              <div
                className="inspection-draft-card__meta"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {draftSyncStatus && draftSyncStatus !== 'synced' ? (
                  <div className="small text-warning-emphasis">Sync pending</div>
                ) : null}
                <CButton
                  type="button"
                  color="link"
                  size="sm"
                  className="inspection-draft-delete-btn p-1 text-danger shadow-none border-0"
                  aria-label="Delete draft"
                  onClick={() => onDeleteDraft?.(draftRow)}
                >
                  <Trash2 size={15} />
                </CButton>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      <div
        className="inspection-mobile-home__section d-grid gap-2 mb-1"
        data-testid="drill-report-mobile-records"
      >
        <div className="fw-semibold text-muted">Recent Records</div>
        <div className="inspection-mobile-home__records-toolbar d-flex align-items-center justify-content-between gap-2">
          <RecordScopeSegmentedControl value={recordScope} onChange={onRecordScopeChange} />
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="inspection-view-all-btn inspection-compact-action-btn d-inline-flex align-items-center"
            disabled={isRecordsLoading}
            onClick={onViewRecords}
          >
            View all
            {recordsCount ? ` (${recordsCount})` : ''}
          </CButton>
        </div>
      </div>

      {isRecordsLoading ? (
        <div className="border rounded-3 bg-body">
          <TableLoader message="Loading records..." minHeight={112} />
        </div>
      ) : recentRecords.length > 0 ? (
        <MobileRecordList
          sections={[
            { key: 'recent-drill-records', variant: 'list-group', items: recentRecordItems },
          ]}
        />
      ) : (
        <PageState
          variant="empty"
          message="No records yet."
          minHeight={96}
          className="border rounded-3"
        />
      )}
    </div>
  )
}

export default DrillMobileHome
