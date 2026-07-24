import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Download, Pencil, Printer } from 'lucide-react'
import TableLoader from 'src/components/TableLoader'
import ButtonLoader from 'src/components/ButtonLoader'
import RecordStateBadge from 'src/components/RecordStateBadge'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import RosterStat from './RosterStat'
import RosterFilter from './RosterFilter'
import RosterCard from './RosterCard'
import RosterMobileDayList from './RosterMobileDayList'
import useRosterState from './useRosterState'
import { exportRosterSchedule, printRosterSchedule } from './rosterPrintExport'
import { hasPermission } from 'src/utils/authz'
import ModulePageHeader from 'src/components/ModulePageHeader'
import RouteNavTabs from 'src/components/RouteNavTabs'
// Tab config

const TAB_KEYS = ['overview', 'schedule']
const DEFAULT_TAB = 'overview'

const TAB_BY_PATH = {
  overview: 'overview',
  schedule: 'schedule',
}

const PATH_BY_TAB = {
  overview: 'overview',
  schedule: 'schedule',
}

const ghostBtn = 'text-primary px-2 py-1 border-0 bg-transparent shadow-none'

// Publish status badge

const PublishBadge = ({ status }) => {
  if (!status) return null
  return <RecordStateBadge state={status === 'published' ? 'published' : 'draft'} />
}

// Overview tab

const OverviewTab = ({ canManageRoster, exportedBy }) => {
  const {
    state: { stats, monthlyStats, teams, allShifts, teamStatuses, loading },
  } = useRosterState(canManageRoster, true, 'all') // publishedOnly=true, fetch all historical data

  return (
    <section data-testid="roster-management-overview">
      <RosterStat
        stats={stats}
        statuses={teamStatuses}
        teams={teams}
        monthlyStats={monthlyStats}
        allShifts={allShifts}
        loading={loading}
        exportedBy={exportedBy}
      />
    </section>
  )
}

// Schedule tab

const ScheduleTab = ({
  canManageRoster,
  exportedBy,
  defaultRangeType,
  initialStatusFilter,
  initialAttentionFilter,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const {
    state: {
      rangeType,
      dateFilter,
      startDate,
      endDate,
      teamFilter,
      search,
      selectedMonths,
      editMode,
      isSavingDraft,
      isPublishing,
      isDirty,
      statusMessage,
      error,
      loading,
      monthOptions,
      monthWeekGroups,
      filteredRows,
      teams,
      allShifts,
      scopeLabel,
      viewPublishStatus,
    },
    actions: {
      setDateFilter,
      setStartDate,
      setEndDate,
      setTeamFilter,
      setSearch,
      setEditMode,
      handleRangeChange,
      handleClear,
      handleAssign,
      handleSaveDraft,
      handlePublish,
      handleCancelEdit,
      handlePrev,
      handleNext,
      onMonthToggle,
    },
  } = useRosterState(
    canManageRoster,
    false,
    defaultRangeType,
    initialStatusFilter,
    initialAttentionFilter,
  )

  const handleCancelClick = () => {
    if (isDirty) setShowCancelConfirm(true)
    else handleCancelEdit()
  }

  const handlePrint = () => {
    printRosterSchedule({ monthWeekGroups, allShifts, scopeLabel, exportedBy })
  }

  const handleExportXlsx = () => {
    exportRosterSchedule({ filteredRows, allShifts, teams, scopeLabel, exportedBy })
  }

  const handlePublishConfirm = async () => {
    setShowPublishConfirm(false)
    await handlePublish()
  }

  const readModeActions = !editMode ? (
    <div
      className="d-flex flex-wrap align-items-center gap-2"
      data-testid="roster-management-read-actions"
    >
      <CButton
        size="sm"
        className={`d-inline-flex align-items-center ${ghostBtn}`}
        onClick={handlePrint}
        disabled={loading || monthWeekGroups.length === 0}
        title="Print / Save as PDF"
      >
        <Printer size={13} className="me-1 align-text-bottom" />
        Print / PDF
      </CButton>
      <CButton
        size="sm"
        className={`d-inline-flex align-items-center ${ghostBtn}`}
        onClick={handleExportXlsx}
        disabled={loading || filteredRows.length === 0}
        title="Export to Excel"
      >
        <Download size={13} className="me-1 align-text-bottom" />
        Export
      </CButton>
      <CButton
        size="sm"
        className={`d-inline-flex align-items-center ${ghostBtn}`}
        onClick={() => setEditMode(true)}
        data-testid="roster-management-edit-action"
        disabled={loading}
      >
        <Pencil size={13} className="me-1 align-text-bottom" />
        Edit Roster
      </CButton>
    </div>
  ) : null

  return (
    <>
      <ModulePageHeader
        title="Roster Schedule"
        subtitle={
          scopeLabel
            ? `Manage team assignments for ${scopeLabel}.`
            : 'Manage roster assignments by date and shift.'
        }
        actions={readModeActions}
      />
      <CCard className="mb-4" data-testid="roster-management-schedule">
        <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span>Roster Schedule</span>
            {!editMode && viewPublishStatus && <PublishBadge status={viewPublishStatus} />}
            {editMode && scopeLabel && (
              <span className="text-muted small fw-normal">- editing {scopeLabel}</span>
            )}
          </div>

          {editMode && (
            <div
              className="d-flex flex-wrap align-items-center gap-2 justify-content-end"
              data-testid="roster-management-edit-actions"
            >
              <CButton
                size="sm"
                className={ghostBtn}
                disabled={isSavingDraft || isPublishing}
                onClick={handleSaveDraft}
                title="Save privately - teams will not be notified"
                data-testid="roster-management-save-draft-action"
              >
                {isSavingDraft ? <ButtonLoader label="Saving..." /> : 'Save Draft'}
              </CButton>
              <CButton
                size="sm"
                className={ghostBtn}
                disabled={isSavingDraft || isPublishing}
                onClick={() => setShowPublishConfirm(true)}
                title="Publish and notify all assigned teams"
                data-testid="roster-management-publish-action"
              >
                {isPublishing ? <ButtonLoader label="Publishing..." /> : 'Publish'}
              </CButton>
              <CButton
                size="sm"
                className={ghostBtn}
                disabled={isSavingDraft || isPublishing}
                onClick={handleCancelClick}
                data-testid="roster-management-cancel-action"
              >
                Cancel
              </CButton>
            </div>
          )}
        </CCardHeader>

        <CCardBody className="p-4">
          {statusMessage && (
            <CAlert color="success" className="mb-4">
              {statusMessage}
            </CAlert>
          )}
          {error && (
            <CAlert color="danger" className="mb-4">
              {error}
            </CAlert>
          )}

          <div data-testid="roster-management-filters">
            <RosterFilter
              rangeType={rangeType}
              onRangeChange={handleRangeChange}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              teamFilter={teamFilter}
              onTeamChange={setTeamFilter}
              search={search}
              onSearchChange={setSearch}
              monthOptions={monthOptions}
              selectedMonths={selectedMonths}
              onMonthToggle={onMonthToggle}
              onClear={handleClear}
              onPrev={handlePrev}
              onNext={handleNext}
              teams={teams}
            />
          </div>

          {loading ? (
            <TableLoader />
          ) : !loading && teams.length === 0 ? (
            <div className="text-center text-muted py-4">
              No teams configured yet.{' '}
              <Link to="/team/details" className="text-primary">
                Go to Team Details
              </Link>{' '}
              to set up teams first.
            </div>
          ) : monthWeekGroups.length === 0 ? (
            <div className="text-center text-muted py-4">No roster found for this period.</div>
          ) : (
            <div id="roster-print-area">
              {allShifts.some((s) => s.builtin === false) && (
                <div className="vmecc-caption d-flex align-items-center gap-2 mb-3 text-body-secondary">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#f59e0b',
                      display: 'inline-block',
                    }}
                  />
                  Custom shift
                </div>
              )}
              <div className="d-none d-md-block">
                {monthWeekGroups.map((monthBlock) => (
                  <RosterCard
                    key={monthBlock.month}
                    monthBlock={monthBlock}
                    editMode={editMode}
                    teams={teams}
                    allShifts={allShifts}
                    onAssign={handleAssign}
                  />
                ))}
              </div>
              <RosterMobileDayList
                monthWeekGroups={monthWeekGroups}
                editMode={editMode}
                teams={teams}
                allShifts={allShifts}
                onAssign={handleAssign}
              />
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Discard confirmation */}
      <CModal
        visible={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Discard changes?</CModalTitle>
        </CModalHeader>
        <CModalBody
          className="text-body-secondary"
          data-testid={showCancelConfirm ? 'roster-management-cancel-modal' : undefined}
        >
          You have unsaved roster changes for <strong>{scopeLabel}</strong>. Cancelling will discard
          them.
        </CModalBody>
        <CModalFooter>
          <CButton
            color="light"
            onClick={() => setShowCancelConfirm(false)}
            data-testid={
              showCancelConfirm ? 'roster-management-cancel-modal-close-action' : undefined
            }
          >
            Keep editing
          </CButton>
          <CButton
            color="danger"
            onClick={() => {
              setShowCancelConfirm(false)
              handleCancelEdit()
            }}
          >
            Discard changes
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Publish confirmation */}
      <CModal
        visible={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Publish Roster?</CModalTitle>
        </CModalHeader>
        <CModalBody
          data-testid={showPublishConfirm ? 'roster-management-publish-modal' : undefined}
        >
          <p className="mb-3">
            You are about to publish the roster for <strong>{scopeLabel}</strong>.
          </p>
          <p className="text-body-secondary mb-0">
            All members of the assigned teams will receive an email notification with their shift
            schedule.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={() => setShowPublishConfirm(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handlePublishConfirm}>
            Confirm & Publish
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

// Main component

const RosterManagement = () => {
  const authUser = useSelector((state) => state.authUser)
  const canManageRoster = hasPermission(authUser, 'rosters.manage')
  const exportedBy = authUser?.name || authUser?.email || 'Unknown'
  const location = useLocation()
  const navigate = useNavigate()

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || ''
  const resolvedTab = TAB_BY_PATH[pathSegment] || DEFAULT_TAB
  const queueParams = new URLSearchParams(location.search)
  const queueRange = queueParams.get('range') === 'all' ? 'all' : 'month'
  const queueAttention = queueParams.get('attention') === 'draft' ? 'draft' : null

  const switchTab = (tab) => {
    if (!TAB_KEYS.includes(tab)) return
    navigate(`/roster/${PATH_BY_TAB[tab]}`, { replace: true })
  }

  if (!canManageRoster) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage rosters.
      </CAlert>
    )
  }

  return (
    <CContainer fluid data-testid="roster-management-module">
      <ModulePageHeader
        title="Roster Management"
        subtitle="Review published coverage and manage roster assignments by shift."
        mobileSubtitle="Coverage and roster assignments."
      />
      <div data-testid="roster-management-nav">
        <RouteNavTabs
          currentPath={resolvedTab}
          navigate={(tab) => switchTab(tab)}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              to: 'overview',
              match: 'overview',
            },
            {
              key: 'schedule',
              label: 'Roster Schedule',
              to: 'schedule',
              match: 'schedule',
            },
          ]}
        />
      </div>

      {resolvedTab === 'overview' && (
        <OverviewTab canManageRoster={canManageRoster} exportedBy={exportedBy} />
      )}
      {resolvedTab === 'schedule' && (
        <ScheduleTab
          canManageRoster={canManageRoster}
          exportedBy={exportedBy}
          defaultRangeType={queueRange}
          initialStatusFilter={null}
          initialAttentionFilter={queueAttention}
        />
      )}
    </CContainer>
  )
}

export default RosterManagement
