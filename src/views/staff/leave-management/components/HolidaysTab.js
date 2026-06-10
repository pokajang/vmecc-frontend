import React, { useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import HolidayCreateModal from './HolidayCreateModal'

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getYear = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return String(date.getFullYear())
}

const HolidaysTab = ({
  holidaySearch,
  setHolidaySearch,
  holidaySort,
  setHolidaySort,
  holidayScopeFilter,
  setHolidayScopeFilter,
  holidayStateFilter,
  setHolidayStateFilter,
  holidayYearFilter,
  setHolidayYearFilter,
  holidaySortOptions,
  holidayScopeOptions,
  holidayStateOptions,
  holidayYearOptions,
  allHolidayRows = [],
  existingNationalDefaultsForYear = [],
  filteredHolidays,
  visibleHolidayRows,
  holidayRowsToShow,
  setHolidayRowsToShow,
  totalCount,
  clearHolidayFilters,
  onSaveHoliday,
  onDeleteHoliday,
  onWizardSavedSummary,
  initialYear,
  isLoading = false,
}) => {
  const [isHolidayModalVisible, setIsHolidayModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [modalMode, setModalMode] = useState('wizard')
  const [editingRowId, setEditingRowId] = useState(null)
  const [draft, setDraft] = useState({
    name: '',
    date: '',
    scope: 'National',
    state: 'All States',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailHoliday, setDetailHoliday] = useState(null)

  const groupedListRows = useMemo(() => {
    const groups = []
    const indexByYear = new Map()

    visibleHolidayRows.forEach((row, index) => {
      const year = getYear(row.date)
      const entry = {
        row,
        displayIndex: index + 1,
      }
      const foundIndex = indexByYear.get(year)
      if (foundIndex === undefined) {
        const nextGroup = { year, entries: [entry] }
        indexByYear.set(year, groups.length)
        groups.push(nextGroup)
        return
      }
      groups[foundIndex].entries.push(entry)
    })

    return groups
  }, [visibleHolidayRows])

  const openCreateModal = () => {
    setModalMode('wizard')
    setEditingRowId(null)
    setDraft({
      name: '',
      date: '',
      scope: 'National',
      state: 'All States',
    })
    setSaveError(null)
    setIsHolidayModalVisible(true)
  }

  const openEditModal = (row) => {
    if (!row?.id) return
    setModalMode('single')
    setEditingRowId(row.id)
    setDraft({
      name: row.name || '',
      date: row.date || '',
      scope: row.scope || 'National',
      state: row.state || 'All States',
    })
    setSaveError(null)
    setIsHolidayModalVisible(true)
  }

  const openHolidayDetail = (row) => {
    if (!row?.id) return
    setDetailHoliday(row)
  }

  const closeHolidayDetail = () => {
    setDetailHoliday(null)
  }

  const closeModal = () => {
    setIsHolidayModalVisible(false)
    setSaveError(null)
    setIsSaving(false)
  }

  const updateDraft = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'scope' && value === 'National') next.state = 'All States'
      return next
    })
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveError(null)

    const result = await onSaveHoliday({
      id: editingRowId,
      name: String(draft.name || '').trim(),
      date: draft.date,
      scope: draft.scope,
      state: draft.scope === 'State' ? draft.state : 'All States',
    })

    setIsSaving(false)
    if (result?.ok) {
      closeModal()
      return
    }

    setSaveError(result?.error || 'Unable to save holiday. Please retry.')
  }

  const handleDeleteRequest = async (row) => {
    if (!row?.id || typeof onDeleteHoliday !== 'function' || isDeleting) return
    setIsDeleting(true)
    await onDeleteHoliday({ id: row.id, name: row.name })
    setIsDeleting(false)
  }

  const handleWizardConfirm = async ({ nationalDefaults = [], additionalHolidays = [] }) => {
    if (isSaving) return { ok: false, error: 'Save in progress. Please wait.' }
    setIsSaving(true)
    setSaveError(null)

    const normalizedNationals = Array.isArray(nationalDefaults) ? nationalDefaults : []
    const normalizedAdditionals = Array.isArray(additionalHolidays) ? additionalHolidays : []
    const applicableNationals = normalizedNationals.filter((row) => Boolean(row?.applicable))
    const payloads = [
      ...applicableNationals.map((row) => ({
        name: String(row.name || '').trim(),
        date: row.date,
        scope: row.scope || 'National',
        state: row.scope === 'State' ? row.state || 'All States' : 'All States',
      })),
      ...normalizedAdditionals.map((row) => ({
        name: String(row.name || '').trim(),
        date: row.date,
        scope: row.scope || 'National',
        state: row.scope === 'State' ? row.state || 'All States' : 'All States',
      })),
    ]

    let error = null
    for (const payload of payloads) {
      const result = await onSaveHoliday(payload)
      if (!result?.ok) {
        error = result?.error || 'Unable to save holidays. Please retry.'
        break
      }
    }

    setIsSaving(false)

    if (error) {
      setSaveError(error)
      return { ok: false, error }
    }

    closeModal()
    if (typeof onWizardSavedSummary === 'function') {
      onWizardSavedSummary({
        nationalCount: applicableNationals.length,
        additionalCount: normalizedAdditionals.length,
      })
    }
    return { ok: true }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <span>Set Holidays</span>
        <CreateActionButton label="Configure holidays" onClick={openCreateModal} />
      </CCardHeader>
      <CCardBody>
        <HolidayCreateModal
          visible={isHolidayModalVisible}
          onClose={closeModal}
          draft={draft}
          onChange={updateDraft}
          onSave={handleSave}
          isSaving={isSaving}
          saveError={saveError}
          isEditing={modalMode === 'single' && Boolean(editingRowId)}
          mode={modalMode}
          initialYear={initialYear}
          existingNationalDefaults={existingNationalDefaultsForYear}
          onConfirmWizard={handleWizardConfirm}
        />
        <CModal visible={Boolean(detailHoliday)} alignment="center" onClose={closeHolidayDetail}>
          <CModalHeader onClose={closeHolidayDetail}>
            <CModalTitle>Holiday Details</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {detailHoliday ? (
              <div className="d-grid gap-2">
                <div>
                  <div className="small text-body-secondary">Holiday</div>
                  <div className="fw-semibold">{detailHoliday.name || '-'}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">Date</div>
                  <div>{formatDate(detailHoliday.date)}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">Scope</div>
                  <div>{detailHoliday.scope || '-'}</div>
                </div>
                <div>
                  <div className="small text-body-secondary">State</div>
                  <div>
                    {detailHoliday.scope === 'State' ? detailHoliday.state || '-' : 'All States'}
                  </div>
                </div>
              </div>
            ) : null}
          </CModalBody>
          <CModalFooter>
            <CButton color="light" onClick={closeHolidayDetail}>
              Close
            </CButton>
          </CModalFooter>
        </CModal>

        <TableFilters
          searchValue={holidaySearch}
          onSearchChange={setHolidaySearch}
          searchPlaceholder="Search holiday name, date, scope, or state"
          showPeriod={false}
          filters={[
            {
              key: 'sort',
              value: holidaySort,
              onChange: setHolidaySort,
              options: holidaySortOptions,
            },
            {
              key: 'year',
              value: holidayYearFilter,
              onChange: setHolidayYearFilter,
              options: holidayYearOptions,
            },
            {
              key: 'scope',
              value: holidayScopeFilter,
              onChange: setHolidayScopeFilter,
              options: holidayScopeOptions,
            },
            {
              key: 'state',
              value: holidayStateFilter,
              onChange: setHolidayStateFilter,
              options: holidayStateOptions,
            },
          ]}
          onClear={clearHolidayFilters}
          rowClassName="flex-md-nowrap"
          searchColMd={4}
          filterColMd={2}
          clearColMd="auto"
        />

        {isLoading ? (
          <TableLoader />
        ) : filteredHolidays.length === 0 ? (
          <div className="text-body-secondary">No holidays match the current filters.</div>
        ) : (
          <>
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell className="text-start">Date</CTableHeaderCell>
                    <CTableHeaderCell className="text-start">Holiday</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Scope</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">State</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {groupedListRows.flatMap((group) => [
                    <CTableRow key={`year-${group.year}`} className="table-light">
                      <CTableDataCell
                        colSpan={6}
                        className="fw-semibold text-body-secondary text-start"
                      >
                        {group.year}
                      </CTableDataCell>
                    </CTableRow>,
                    ...group.entries.map(({ row, displayIndex }) => (
                      <CTableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => openHolidayDetail(row)}
                      >
                        <CTableDataCell className="text-center text-muted">
                          {displayIndex}
                        </CTableDataCell>
                        <CTableDataCell className="text-start">
                          {formatDate(row.date)}
                        </CTableDataCell>
                        <CTableDataCell className="text-start">{row.name}</CTableDataCell>
                        <CTableDataCell className="text-center">{row.scope}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          {row.scope === 'State' ? row.state || '-' : '-'}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <RowActions
                            items={[
                              {
                                key: 'edit',
                                label: 'Edit',
                                onClick: () => openEditModal(row),
                              },
                              {
                                key: 'delete',
                                label: 'Delete',
                                className: 'text-danger',
                                onClick: () => handleDeleteRequest(row),
                              },
                            ]}
                          />
                        </CTableDataCell>
                      </CTableRow>
                    )),
                  ])}
                </CTableBody>
              </CTable>
            </div>
            <DataTableFooter
              rowsToShow={holidayRowsToShow}
              onRowsToShowChange={setHolidayRowsToShow}
              filteredCount={filteredHolidays.length}
              totalCount={totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default HolidaysTab
