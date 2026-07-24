import { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormLabel,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import EditControls from 'src/components/EditControls'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileRecordList from 'src/components/MobileRecordList'
import TableLoader from 'src/components/TableLoader'
import {
  fetchShiftWindows,
  saveShiftWindows,
  fetchCustomShifts,
  saveCustomShift,
  updateCustomShift,
  deleteCustomShift,
} from 'src/services/apiClient'

// Built-in shift windows (Normal / Day / Night)

const SHIFT_FIELDS = [
  {
    key: 'normal',
    label: 'Normal',
    startKey: 'normal_start',
    endKey: 'normal_end',
    defaultStart: '08:00',
    defaultEnd: '17:00',
  },
  {
    key: 'day',
    label: 'Day',
    startKey: 'day_start',
    endKey: 'day_end',
    defaultStart: '07:00',
    defaultEnd: '19:00',
  },
  {
    key: 'night',
    label: 'Night',
    startKey: 'night_start',
    endKey: 'night_end',
    defaultStart: '19:00',
    defaultEnd: '07:00',
  },
]

const BuiltinShifts = () => {
  const [editMode, setEditMode] = useState(false)
  const [times, setTimes] = useState(() =>
    Object.fromEntries(
      SHIFT_FIELDS.flatMap(({ startKey, endKey, defaultStart, defaultEnd }) => [
        [startKey, defaultStart],
        [endKey, defaultEnd],
      ]),
    ),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchShiftWindows()
      if (resp?.data) {
        const updates = {}
        SHIFT_FIELDS.forEach(({ startKey, endKey, defaultStart, defaultEnd }) => {
          updates[startKey] = resp.data[startKey] || defaultStart
          updates[endKey] = resp.data[endKey] || defaultEnd
        })
        setTimes(updates)
      }
    } catch (err) {
      setError(err.payload?.message || 'Unable to load shift windows.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await saveShiftWindows(times)
      setStatusMessage('Shift windows saved.')
      setTimeout(() => setStatusMessage(null), 2500)
      setEditMode(false)
    } catch (err) {
      setError(err.payload?.message || 'Unable to save shift windows.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setError(null)
    setStatusMessage(null)
    load()
  }
  const mobileShiftSections = [
    {
      key: 'builtin-shifts',
      items: SHIFT_FIELDS.map(({ key, label, startKey, endKey }) => ({
        key,
        content: (
          <div className="d-grid gap-3">
            <div className="fw-semibold">{label}</div>
            <div className="d-grid gap-2">
              <CFormLabel htmlFor={`mobile-${key}-shift-start`} className="text-muted mb-0">
                Start
              </CFormLabel>
              <CFormInput
                id={`mobile-${key}-shift-start`}
                type="time"
                size="sm"
                value={times[startKey]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [startKey]: e.target.value }))}
                disabled={!editMode || loading}
              />
              <CFormLabel htmlFor={`mobile-${key}-shift-end`} className="text-muted mb-0">
                End
              </CFormLabel>
              <CFormInput
                id={`mobile-${key}-shift-end`}
                type="time"
                size="sm"
                value={times[endKey]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [endKey]: e.target.value }))}
                disabled={!editMode || loading}
              />
            </div>
          </div>
        ),
      })),
    },
  ]

  return (
    <CCard className="mb-4" data-testid="shift-settings-built-in">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Work shift windows</span>
        <EditControls
          editMode={editMode}
          loading={loading}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </CCardHeader>
      <CCardBody>
        <p className="text-muted mb-3">Define start/end times for normal, day, and night shifts.</p>
        {error && <div className="text-danger small mb-3">{error}</div>}
        {statusMessage && <div className="text-success small mb-3">{statusMessage}</div>}
        <MobileRecordList sections={mobileShiftSections} variant="list-group" />
        <div className="d-none d-md-grid gap-3">
          {SHIFT_FIELDS.map(({ key, label, startKey, endKey }) => (
            <div
              key={key}
              className="d-grid d-sm-flex align-items-sm-center gap-2 gap-sm-3"
              style={{ gridTemplateColumns: '1fr' }}
            >
              <div className="fw-medium" style={{ minWidth: 60 }}>
                {label}
              </div>
              <CFormLabel
                htmlFor={`desktop-${key}-shift-start`}
                className="text-muted mb-0"
                style={{ minWidth: 50 }}
              >
                Start
              </CFormLabel>
              <CFormInput
                id={`desktop-${key}-shift-start`}
                type="time"
                size="sm"
                value={times[startKey]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [startKey]: e.target.value }))}
                disabled={!editMode || loading}
                style={{ maxWidth: 160, minWidth: 0 }}
              />
              <CFormLabel
                htmlFor={`desktop-${key}-shift-end`}
                className="text-muted mb-0"
                style={{ minWidth: 40 }}
              >
                End
              </CFormLabel>
              <CFormInput
                id={`desktop-${key}-shift-end`}
                type="time"
                size="sm"
                value={times[endKey]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [endKey]: e.target.value }))}
                disabled={!editMode || loading}
                style={{ maxWidth: 160, minWidth: 0 }}
              />
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  )
}

// Custom shifts

const EMPTY_FORM = { name: '', start: '08:00', end: '17:00' }

const CustomShifts = () => {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = add, object = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchCustomShifts()
      setShifts(resp?.data || [])
    } catch (err) {
      setError(err.payload?.message || 'Unable to load custom shifts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (shift) => {
    setEditing(shift)
    setForm({ name: shift.name, start: shift.start, end: shift.end })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setFormError(null)
  }

  const handleFormChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Shift name is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const resp = await updateCustomShift(editing.id, form)
        setShifts((prev) => prev.map((s) => (s.id === editing.id ? resp.data : s)))
      } else {
        const resp = await saveCustomShift(form)
        setShifts((prev) => [...prev, resp.data])
      }
      window.dispatchEvent(new CustomEvent('custom-shifts-changed'))
      setModalOpen(false)
    } catch (err) {
      setFormError(err.payload?.message || 'Unable to save shift.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (shift) => setDeleteTarget(shift)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCustomShift(deleteTarget.id)
      setShifts((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      window.dispatchEvent(new CustomEvent('custom-shifts-changed'))
      setDeleteTarget(null)
    } catch (err) {
      setError(err.payload?.message || 'Unable to delete shift.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }
  const mobileCustomShiftSections = [
    {
      key: 'custom-shifts',
      items: shifts.map((shift) => ({
        key: shift.id,
        title: shift.name,
        fields: [
          { key: 'start', label: 'Start', value: shift.start },
          { key: 'end', label: 'End', value: shift.end },
        ],
        actions: (
          <div className="d-flex gap-1 justify-content-end">
            <CButton
              size="sm"
              color="link"
              className="text-muted p-1"
              onClick={() => openEdit(shift)}
              title={`Edit ${shift.name}`}
              aria-label={`Edit ${shift.name}`}
            >
              <Pencil size={14} />
            </CButton>
            <CButton
              size="sm"
              color="link"
              className="text-danger p-1"
              onClick={() => confirmDelete(shift)}
              title={`Delete ${shift.name}`}
              aria-label={`Delete ${shift.name}`}
            >
              <Trash2 size={14} />
            </CButton>
          </div>
        ),
      })),
    },
  ]

  return (
    <>
      <CCard className="mb-4" data-testid="shift-settings-custom">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>Custom Shifts</span>
          <span data-testid="shift-settings-custom-create-action">
            <CreateActionButton label="Add Shift" onClick={openAdd} disabled={loading} />
          </span>
        </CCardHeader>
        <CCardBody>
          <p className="text-muted mb-3">Add custom shift types beyond normal, day, and night.</p>
          {error && <div className="text-danger small mb-3">{error}</div>}
          {loading && <TableLoader />}
          {!loading && shifts.length === 0 && (
            <div className="text-muted small">No custom shifts defined yet.</div>
          )}
          {!loading && shifts.length > 0 && (
            <>
              <div className="rounded-3 shadow-sm overflow-hidden bg-body d-none d-md-block">
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: 56 }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Start</CTableHeaderCell>
                      <CTableHeaderCell>End</CTableHeaderCell>
                      <CTableHeaderCell
                        className="table-sticky-action-cell"
                        style={{ width: 80 }}
                      />
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {shifts.map((shift, index) => (
                      <CTableRow key={shift.id}>
                        <CTableDataCell className="text-center text-muted">
                          {index + 1}
                        </CTableDataCell>
                        <CTableDataCell>{shift.name}</CTableDataCell>
                        <CTableDataCell>{shift.start}</CTableDataCell>
                        <CTableDataCell>{shift.end}</CTableDataCell>
                        <CTableDataCell className="table-sticky-action-cell text-center align-middle">
                          <div className="d-flex gap-1 justify-content-end">
                            <CButton
                              size="sm"
                              color="link"
                              className="text-muted p-1"
                              onClick={() => openEdit(shift)}
                              title={`Edit ${shift.name}`}
                              aria-label={`Edit ${shift.name}`}
                            >
                              <Pencil size={14} />
                            </CButton>
                            <CButton
                              size="sm"
                              color="link"
                              className="text-danger p-1"
                              onClick={() => confirmDelete(shift)}
                              title={`Delete ${shift.name}`}
                              aria-label={`Delete ${shift.name}`}
                            >
                              <Trash2 size={14} />
                            </CButton>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
              <MobileRecordList sections={mobileCustomShiftSections} variant="list-group" />
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Add / Edit modal */}
      <CModal visible={modalOpen} onClose={closeModal} alignment="center">
        <CModalHeader>
          <CModalTitle>{editing ? 'Edit shift' : 'Add custom shift'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {formError && <div className="text-danger small mb-3">{formError}</div>}
          <div className="d-grid gap-3">
            <div>
              <CFormLabel htmlFor="custom-shift-name">Shift name</CFormLabel>
              <CFormInput
                id="custom-shift-name"
                placeholder="e.g. Evening, Split, Flexi"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="d-flex flex-wrap gap-3">
              <div className="flex-fill">
                <CFormLabel htmlFor="custom-shift-start">Start time</CFormLabel>
                <CFormInput
                  id="custom-shift-start"
                  type="time"
                  value={form.start}
                  onChange={(e) => handleFormChange('start', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="flex-fill">
                <CFormLabel htmlFor="custom-shift-end">End time</CFormLabel>
                <CFormInput
                  id="custom-shift-end"
                  type="time"
                  value={form.end}
                  onChange={(e) => handleFormChange('end', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeModal} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete confirmation modal */}
      <CModal visible={!!deleteTarget} onClose={() => setDeleteTarget(null)} alignment="center">
        <CModalHeader>
          <CModalTitle>Delete Shift</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

// Page root

const WorkShift = () => (
  <>
    <BuiltinShifts />
    <CustomShifts />
  </>
)

export default WorkShift
