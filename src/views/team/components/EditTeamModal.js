import { useMemo, useRef, useState } from 'react'
import Select from 'react-select'
import {
  CAlert,
  CButton,
  CCol,
  CForm,
  CFormLabel,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { ImagePlus, Trash2, UploadCloud, X } from 'lucide-react'
import StatusPill from './StatusPill'
import DeleteTeamModal from './DeleteTeamModal'
import { updateTeam, updateTeamWithImage } from 'src/services/apiClient'
import { roleScopeMap } from 'src/views/users/CreateStaffForm'
import { getPrimaryRoleLabel } from 'src/utils/authz'
import { PRESET_IMAGES, toPresetValue } from './teamImageUtils'
import { TEAM_ELIGIBLE_ROLES } from './teamRoleUtils'
import ButtonLoader from 'src/components/ButtonLoader'

const getActiveAssignments = (user) => {
  if (Array.isArray(user?.role_assignments) && user.role_assignments.length > 0) {
    return user.role_assignments.filter((assignment) => assignment?.active !== false)
  }

  return (user?.roles || []).map((role, index) => ({
    role,
    scope_type: roleScopeMap[role] || 'office',
    team_id: null,
    is_primary: index === 0,
    active: true,
  }))
}

const resolveTeamRole = (user, teamId) => {
  const assignments = getActiveAssignments(user).filter((assignment) =>
    TEAM_ELIGIBLE_ROLES.some((roleName) =>
      String(assignment?.role || '')
        .toLowerCase()
        .includes(roleName),
    ),
  )

  const exactMatch = assignments.find(
    (assignment) => String(assignment?.team_id || '') === String(teamId),
  )
  if (exactMatch?.role) return exactMatch.role

  const scopeMatch = assignments.find(
    (assignment) => assignment?.scope_type === 'site' && !assignment?.team_id,
  )
  if (scopeMatch?.role) return scopeMatch.role

  return assignments[0]?.role || null
}

const buildInitialMembers = (team, membersSource, todayStr) =>
  (team?.members || []).map((m) => {
    const opt =
      membersSource.find((o) => o.id === m.user_id) || membersSource.find((o) => o.name === m.name)
    if (opt) {
      const role = resolveTeamRole(opt, team?.id) || m.role || getPrimaryRoleLabel(opt)
      return {
        value: opt.id,
        label: `${opt.name || ''}${role ? ` - ${role}` : ''}`,
        name: opt.name,
        role,
        user_id: opt.id,
        started_at: m.started_at || todayStr,
      }
    }
    return {
      value: `custom-${m.id || m.name}`,
      label: `${m.name}${m.role ? ` - ${m.role}` : ''}`,
      name: m.name,
      role: m.role,
      started_at: m.started_at || todayStr,
    }
  })

const getInitialImageState = (currentImageUrl) => {
  if (!currentImageUrl) return { preview: null, selected: null }
  if (currentImageUrl.startsWith('preset:')) {
    return { preview: null, selected: currentImageUrl.slice('preset:'.length) }
  }
  return { preview: currentImageUrl, selected: 'upload' }
}

// ─── Image Picker ────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MB — must match backend max:4096

const ImagePicker = ({ currentImageUrl, onChange }) => {
  const fileInputRef = useRef(null)
  const initialImageState = getInitialImageState(currentImageUrl)
  const [preview, setPreview] = useState(initialImageState.preview) // local file preview URL
  const [uploadFile, setUploadFile] = useState(null) // File object to upload
  const [selected, setSelected] = useState(initialImageState.selected) // preset key or 'upload' or null
  const [fileError, setFileError] = useState(null)

  const handlePresetClick = (preset) => {
    setSelected(preset.key)
    setPreview(null)
    setUploadFile(null)
    onChange({ type: 'preset', presetKey: preset.key, src: preset.src, file: null, clear: false })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileError('Image must be 4 MB or smaller.')
      e.target.value = ''
      return
    }
    setFileError(null)
    // Revoke previous object URL before creating a new one to avoid memory leaks
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    const url = URL.createObjectURL(file)
    setPreview(url)
    setUploadFile(file)
    setSelected('upload')
    onChange({ type: 'file', src: url, file, clear: false })
    e.target.value = ''
  }

  const handleClear = () => {
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setSelected(null)
    setUploadFile(null)
    onChange({ type: 'clear', src: null, file: null, clear: true })
  }

  const activePreview =
    preview ||
    (selected && selected !== 'upload' ? PRESET_IMAGES.find((p) => p.key === selected)?.src : null)

  return (
    <div>
      {/* Current / preview */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className="rounded-3 overflow-hidden flex-shrink-0"
          style={{
            width: 72,
            height: 72,
            background: 'var(--cui-tertiary-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          {activePreview ? (
            <img
              src={activePreview}
              alt="Team"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-body-secondary">
              <ImagePlus size={22} />
            </div>
          )}
        </div>
        <div className="d-flex flex-column gap-1">
          <span className="small fw-semibold">Team Photo</span>
          <div className="d-flex gap-2">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="d-inline-flex align-items-center gap-1"
            >
              <UploadCloud size={13} />
              {uploadFile ? 'Change' : 'Upload'}
            </CButton>
            {(selected || preview) && (
              <CButton
                size="sm"
                color="danger"
                variant="ghost"
                className="p-1 border-0"
                onClick={handleClear}
                title="Remove photo"
              >
                <X size={14} />
              </CButton>
            )}
          </div>
          {fileError ? (
            <span className="text-danger" style={{ fontSize: '0.7rem' }}>
              {fileError}
            </span>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
              JPG, PNG, WebP · max 4 MB
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="d-none"
          onChange={handleFileChange}
        />
      </div>

      {/* Preset recommendations */}
      <div className="text-muted small mb-2">Recommended presets</div>
      <div className="d-flex gap-2 flex-wrap">
        {PRESET_IMAGES.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className="p-0 border-0 bg-transparent"
            style={{ outline: 'none' }}
            title={preset.label}
          >
            <div
              className="rounded-2 overflow-hidden"
              style={{
                width: 52,
                height: 52,
                border:
                  selected === preset.key
                    ? '2px solid var(--cui-primary)'
                    : '2px solid transparent',
                outline:
                  selected === preset.key
                    ? '1px solid var(--cui-primary)'
                    : '1px solid var(--cui-border-color)',
                transition: 'border 0.15s',
              }}
            >
              <img
                src={preset.src}
                alt={preset.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="text-center text-muted mt-1" style={{ fontSize: '0.65rem' }}>
              {preset.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

const EditTeamModalContent = ({
  visible,
  team,
  rosterStatus,
  membersSource = [],
  loadingMembers = false,
  assignedUserIds = new Set(),
  onClose,
  onSaved,
  onDeleted,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [members, setMembers] = useState(() => buildInitialMembers(team, membersSource, todayStr))
  const [group, setGroup] = useState(team?.group || '')
  const [selectReset, setSelectReset] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState(null)
  // image state: { type: 'preset'|'file'|'clear'|null, file: File|null, src: string|null, clear: bool }
  const [imageState, setImageState] = useState(null)

  const memberOptions = useMemo(() => {
    const currentIds = new Set(
      (members || [])
        .map((m) => m.user_id || (typeof m.value === 'number' ? m.value : null))
        .filter(Boolean),
    )
    return membersSource
      .filter((u) => {
        const roleForTeam = resolveTeamRole(u, team?.id)
        if (!roleForTeam) return false
        if (currentIds.has(u.id)) return false
        const isCurrentMember = (team?.members || []).some((m) => m.user_id === u.id)
        if (isCurrentMember) return true
        // Policy: one active team per user. The backend enforces this with a
        // partial unique index and a 422 guard. The UI pre-filters to match.
        return !(assignedUserIds || new Set()).has(u.id)
      })
      .map((u) => ({
        value: u.id,
        label: `${u.name || ''}${resolveTeamRole(u, team?.id) ? ` - ${resolveTeamRole(u, team?.id)}` : ''}`,
        name: u.name,
        role: resolveTeamRole(u, team?.id) || getPrimaryRoleLabel(u),
        user_id: u.id,
        started_at: todayStr,
      }))
  }, [membersSource, assignedUserIds, team?.id, team?.members, members, todayStr])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!team) return
    setSaving(true)
    setError(null)
    try {
      const membersPayload = members.map((m) => ({
        user_id: m.user_id || (typeof m.value === 'number' ? m.value : null),
        name: m.name || m.label || '',
        role: m.role || '',
        is_primary: false,
        started_at: m.started_at || todayStr,
      }))

      const payload = { name: team.name, group: group || null, members: membersPayload }

      if (imageState?.type === 'preset') {
        payload.image_url = toPresetValue(imageState.presetKey)
      } else if (imageState?.type === 'clear') {
        payload.image_url = null
      }

      // When a new file is queued, send it together with the members payload in
      // one atomic multipart request instead of two separate calls.
      const resp =
        imageState?.type === 'file' && imageState.file
          ? await updateTeamWithImage(team.id, payload, imageState.file)
          : await updateTeam(team.id, payload)

      onSaved?.(resp?.data)
    } catch (err) {
      // Surface specific field errors (e.g. dual-team conflict) before falling back to generic message
      const memberErrors = err.payload?.errors?.members
      if (memberErrors && memberErrors.length > 0) {
        setError(memberErrors[0])
      } else {
        setError(err.payload?.message || 'Unable to update team.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} alignment="center">
      <CModalHeader>
        <div className="d-flex align-items-center gap-2">
          <CModalTitle>{`Edit ${team?.name ? `${team.name} Team` : 'Team'}`}</CModalTitle>
          <StatusPill label={rosterStatus || 'Unscheduled'} />
        </div>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        <CForm onSubmit={handleSave}>
          <CRow className="g-3">
            {/* Group */}
            <CCol xs={12}>
              <CFormLabel>
                Group <span className="text-muted fw-normal">(optional)</span>
              </CFormLabel>
              <input
                className="form-control"
                type="text"
                maxLength={100}
                placeholder="e.g. Primary, Backup, Standby"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              />
              <small className="text-muted">
                Used to visually group teams on the roster overview.
              </small>
            </CCol>

            {/* Members */}
            <CCol xs={12}>
              <CFormLabel>Members</CFormLabel>
              <Select
                key={selectReset}
                isMulti={false}
                options={memberOptions}
                value={null}
                isLoading={loadingMembers}
                onChange={(opt) => {
                  if (!opt) return
                  setMembers((prev) => {
                    const exists = prev.find((m) => m.user_id === opt.user_id)
                    if (exists) return prev
                    return [...prev, opt]
                  })
                  setSelectReset((k) => k + 1)
                }}
                placeholder="Select team members to add"
                classNamePrefix="react-select"
              />
              <small className="text-muted d-block mt-1">
                Members come from Staff records. Add/remove as needed.
              </small>
              <div className="d-grid gap-2 mt-2">
                {members.map((m) => (
                  <div
                    key={m.user_id || m.value || m.name}
                    className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
                  >
                    <div className="d-grid">
                      <span>
                        {m.name || m.label || '--'}
                        {m.role ? ` - ${m.role}` : ''}
                      </span>
                      <span className="text-muted small">Start: {m.started_at || todayStr}</span>
                    </div>
                    <CButton
                      color="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() =>
                        setMembers((prev) =>
                          prev.filter((x) => (x.user_id || x.value) !== (m.user_id || m.value)),
                        )
                      }
                    >
                      <Trash2 size={18} className="text-danger" />
                    </CButton>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-muted small">No members selected yet.</div>
                )}
              </div>
            </CCol>

            {/* Image picker */}
            <CCol xs={12}>
              <CFormLabel>Team Photo</CFormLabel>
              <ImagePicker
                key={`${team?.id ?? 'none'}-${team?.image_url || 'no-image'}`}
                currentImageUrl={team?.image_url || null}
                onChange={setImageState}
              />
            </CCol>
          </CRow>

          <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
            {/* Delete — left side */}
            <CButton
              size="sm"
              color="danger"
              variant="ghost"
              disabled={saving}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete team
            </CButton>

            {/* Save / Cancel — right side */}
            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" disabled={saving} onClick={onClose}>
                Cancel
              </CButton>
              <CButton size="sm" color="primary" type="submit" disabled={saving}>
                {saving ? <ButtonLoader label="Saving..." /> : 'Save changes'}
              </CButton>
            </div>
          </div>
        </CForm>
      </CModalBody>

      <DeleteTeamModal
        visible={showDeleteModal}
        team={team ? { ...team, members: team.members || [] } : null}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={(id) => {
          setShowDeleteModal(false)
          onDeleted?.(id)
        }}
      />
    </CModal>
  )
}

const EditTeamModal = (props) => (
  <EditTeamModalContent
    key={`${props.visible ? 'open' : 'closed'}-${props.team?.id ?? 'none'}-${props.membersSource?.length ?? 0}`}
    {...props}
  />
)

export default EditTeamModal
