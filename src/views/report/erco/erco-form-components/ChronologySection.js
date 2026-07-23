import React from 'react'
import {
  CAlert,
  CButton,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CTooltip,
} from '@coreui/react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  PhoneCall,
  Plus,
  RotateCcw,
  Route,
  Trash2,
  Undo2,
} from 'lucide-react'
import EditControls from 'src/components/EditControls'
import ChronologyRow from '../ChronologyRow'
import ChronologyRowModal from './ChronologyRowModal'

const ChronologySection = ({
  fieldError,
  showChronologyStarter,
  isChronologyDefault,
  canUndo,
  undoChronology,
  handleResetChronology,
  handleAddSimpleRow,
  isAdvanceMenuOpen,
  setIsAdvanceMenuOpen,
  hasAnyPresetRows,
  hasPreMobRows,
  hasDemobRows,
  handleAddPreMobRows,
  handleAddDemobRows,
  startTimeEditMode,
  responseStartTime,
  setResponseStartTime,
  handleSaveResponseStartTime,
  handleCancelResponseStartTimeEdit,
  handleSetResponseStartTime,
  isChronologyOutOfOrder,
  sortChronologyByTime,
  chronologyRows,
  chronologyRowProps,
  // Row modal (mobile)
  rowModal,
  onOpenAddRowModal,
  onOpenEditRowModal,
  onCloseRowModal,
  onRowModalDraftChange,
  onCommitRowModal,
}) => {
  const { moveChronologyEventPayload, removeChronologyRow } = chronologyRowProps

  return (
    <div className="d-grid gap-3">
      {/* ── Toolbar ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="fw-semibold text-muted">Chronology of Event</div>
        {!showChronologyStarter ? (
          <div className="d-flex align-items-center gap-1 flex-wrap">
            <CTooltip content="Reset events">
              <span className="d-inline-flex">
                <CButton
                  type="button"
                  color="light"
                  size="sm"
                  disabled={isChronologyDefault}
                  onClick={handleResetChronology}
                  aria-label="Reset events"
                  className="text-primary px-2 py-1 border-0 bg-transparent shadow-none d-inline-flex align-items-center gap-1"
                >
                  <RotateCcw size={14} className="d-sm-none" />
                  <span className="d-none d-sm-inline">Reset Events</span>
                </CButton>
              </span>
            </CTooltip>
            {canUndo ? (
              <CTooltip content="Undo last chronology change">
                <CButton
                  type="button"
                  color="light"
                  size="sm"
                  onClick={undoChronology}
                  aria-label="Undo"
                  className="text-secondary px-2 py-1 border-0 bg-transparent shadow-none d-inline-flex align-items-center gap-1"
                >
                  <Undo2 size={14} className="d-sm-none" />
                  <span className="d-none d-sm-inline">Undo</span>
                </CButton>
              </CTooltip>
            ) : null}

            {/* Mobile: opens modal */}
            <CTooltip content="Add row">
              <CButton
                type="button"
                color="light"
                size="sm"
                onClick={onOpenAddRowModal}
                aria-label="Add row"
                className="d-md-none text-primary px-2 py-1 border-0 bg-transparent shadow-none d-inline-flex align-items-center gap-1"
              >
                <Plus size={14} />
              </CButton>
            </CTooltip>
            {/* Desktop: adds inline */}
            <CTooltip content="Add row">
              <CButton
                type="button"
                color="light"
                size="sm"
                onClick={handleAddSimpleRow}
                aria-label="Add row"
                className="d-none d-md-inline-flex text-primary px-2 py-1 border-0 bg-transparent shadow-none align-items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Row</span>
              </CButton>
            </CTooltip>

            <CDropdown
              alignment="end"
              visible={isAdvanceMenuOpen}
              onShow={() => setIsAdvanceMenuOpen(true)}
              onHide={() => setIsAdvanceMenuOpen(false)}
            >
              <CDropdownToggle
                type="button"
                color="light"
                size="sm"
                caret={false}
                className="text-primary px-2 py-1 border-0 bg-transparent shadow-none d-flex align-items-center gap-1"
                aria-label="Add advance row"
              >
                <MoreHorizontal size={15} className="d-sm-none" />
                <span className="d-none d-sm-inline">
                  {hasAnyPresetRows ? 'Add / Remove Advance Row' : 'Add Advance Row'}
                </span>
                {isAdvanceMenuOpen ? (
                  <ChevronDown size={13} className="align-text-bottom" />
                ) : (
                  <ChevronRight size={13} className="align-text-bottom" />
                )}
              </CDropdownToggle>
              <CDropdownMenu>
                <CTooltip
                  content={
                    hasPreMobRows
                      ? 'Remove all PreMob event rows added from preset.'
                      : 'Add the early response rows: incident received, deployment, and stakeholder notification.'
                  }
                >
                  <CDropdownItem
                    onClick={handleAddPreMobRows}
                    className="d-flex align-items-center gap-3 small"
                  >
                    <PhoneCall size={14} />
                    <span>{hasPreMobRows ? 'Remove PreMob Events' : 'Add PreMob Events'}</span>
                  </CDropdownItem>
                </CTooltip>
                <CTooltip
                  content={
                    hasDemobRows
                      ? 'Remove all Demob event rows added from preset.'
                      : 'Add the closing response rows: standdown, debrief or handover, and return to base.'
                  }
                >
                  <CDropdownItem
                    onClick={handleAddDemobRows}
                    className="d-flex align-items-center gap-3 small"
                  >
                    <Route size={14} />
                    <span>{hasDemobRows ? 'Remove Demob Events' : 'Add Demob Events'}</span>
                  </CDropdownItem>
                </CTooltip>
              </CDropdownMenu>
            </CDropdown>
          </div>
        ) : null}
      </div>

      {fieldError ? <CAlert color="danger">{fieldError}</CAlert> : null}

      {showChronologyStarter ? (
        <div className="d-grid gap-2">
          <div className="d-flex align-items-center">
            {startTimeEditMode ? (
              <div className="d-flex align-items-center gap-2">
                <div className="flex-grow-1" style={{ maxWidth: '200px' }}>
                  <CFormInput
                    type="time"
                    aria-label="Response start time"
                    className="form-control form-control-sm"
                    value={responseStartTime}
                    onChange={(event) => setResponseStartTime(event.target.value)}
                    placeholder="Select chronology start time"
                  />
                </div>
                <EditControls
                  editMode={true}
                  loading={false}
                  onSave={handleSaveResponseStartTime}
                  onCancel={handleCancelResponseStartTimeEdit}
                />
              </div>
            ) : (
              <EditControls
                editMode={false}
                loading={false}
                onEdit={handleSetResponseStartTime}
                editLabel="Set Chronology Start Time"
              />
            )}
          </div>
          <div className="small text-body-secondary">
            Usually same as incident time unless response started later.
          </div>
        </div>
      ) : (
        <>
          {isChronologyOutOfOrder ? (
            <div className="small d-flex align-items-center gap-1 text-warning">
              <AlertTriangle size={13} className="flex-shrink-0" />
              <span>Some times are out of order.</span>
              <CButton
                type="button"
                color="link"
                size="sm"
                className="p-0 text-warning fw-semibold shadow-none"
                style={{ textDecoration: 'underline', fontSize: 'inherit' }}
                onClick={sortChronologyByTime}
              >
                Sort by time
              </CButton>
            </div>
          ) : null}

          {/* ── Mobile read-only list — mirrors ChronologyRow grid, inputs replaced with text ── */}
          <div className="erco-chronology-mobile-list d-md-none">
            {chronologyRows.map((row, idx) => {
              const isFirst = idx === 0
              const isLast = idx >= chronologyRows.length - 1
              const isOnly = chronologyRows.length <= 1
              return (
                <div key={row.id} className="erco-chronology-mobile-row">
                  <button
                    type="button"
                    className="erco-chronology-mobile-row__main"
                    onClick={() => onOpenEditRowModal(row)}
                    aria-label={`Edit chronology row ${idx + 1}`}
                  >
                    <span className="erco-chronology-mobile-row__time">
                      {String(row.time || '').trim() || '--:--'}
                    </span>
                    <span className="erco-chronology-mobile-row__action">
                      {String(row.action || '').trim() || 'No action recorded.'}
                    </span>
                  </button>
                  <CDropdown alignment="end">
                    <CDropdownToggle
                      type="button"
                      color="light"
                      size="sm"
                      caret={false}
                      className="erco-chronology-mobile-row__menu"
                      aria-label={`Chronology row ${idx + 1} actions`}
                    >
                      <MoreHorizontal size={16} />
                    </CDropdownToggle>
                    <CDropdownMenu>
                      <CDropdownItem onClick={() => onOpenEditRowModal(row)}>
                        <span className="d-inline-flex align-items-center gap-2">
                          <Pencil size={14} /> Edit
                        </span>
                      </CDropdownItem>
                      <CDropdownItem
                        disabled={isFirst}
                        onClick={() => moveChronologyEventPayload(idx, idx - 1)}
                      >
                        <span className="d-inline-flex align-items-center gap-2">
                          <ArrowUp size={14} /> Move event up
                        </span>
                      </CDropdownItem>
                      <CDropdownItem
                        disabled={isLast}
                        onClick={() => moveChronologyEventPayload(idx, idx + 1)}
                      >
                        <span className="d-inline-flex align-items-center gap-2">
                          <ArrowDown size={14} /> Move event down
                        </span>
                      </CDropdownItem>
                      <CDropdownItem
                        disabled={isOnly}
                        className="text-danger"
                        onClick={() => removeChronologyRow(row.id)}
                      >
                        <span className="d-inline-flex align-items-center gap-2">
                          <Trash2 size={14} /> Delete
                        </span>
                      </CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                </div>
              )
            })}
          </div>

          {/* ── Desktop inline editing ── */}
          <div className="d-none d-md-block">
            <div className="d-flex g-2 mb-1 gap-2">
              <div
                className="small text-body-secondary fw-semibold"
                style={{ flex: '0 0 16.666%' }}
              >
                Time
              </div>
              <div className="small text-body-secondary fw-semibold flex-grow-1">
                Event / Action
              </div>
              <div style={{ flex: '0 0 16.666%' }} />
            </div>
            {chronologyRows.map((row, idx) => (
              <ChronologyRow key={row.id} row={row} idx={idx} {...chronologyRowProps} />
            ))}
          </div>

          <div className="small text-body-secondary d-none d-md-block">
            Tip: While editing an Event / Action field, press Enter to add the next event row.
          </div>
        </>
      )}

      {/* ── Row modal (mobile add/edit) ── */}
      <ChronologyRowModal
        visible={rowModal !== null}
        draft={rowModal}
        onClose={onCloseRowModal}
        onChangeDraft={onRowModalDraftChange}
        onSave={() => onCommitRowModal(false)}
        onSaveAndNext={() => onCommitRowModal(true)}
      />
    </div>
  )
}

export default ChronologySection
