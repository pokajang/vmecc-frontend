import { Pencil } from 'lucide-react'
import StatusPill from './StatusPill'
import { resolveImageUrl } from './teamImageUtils'
import { getRoleBadge, mapRoleLabel } from './teamRoleUtils'
import { getAvatarColors } from 'src/utils/avatarColors'

const TeamCard = ({ team, status, onView, onEdit, canEdit = true }) => {
  const badgeLabel = status || 'Unscheduled'
  const initial = (team.name || '?').trim().charAt(0).toUpperCase()
  const { bg, text: avatarText } = getAvatarColors(team.name)
  const imageUrl = resolveImageUrl(team.image_url)

  const members = Array.isArray(team.members) ? [...team.members] : []
  members.sort((a, b) => {
    const isAic = (m) => (m.role || '').toLowerCase().includes('assistant incident commander')
    if (isAic(a) && !isAic(b)) return -1
    if (!isAic(a) && isAic(b)) return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  const openLabel = `Open team ${team.name || 'details'}`
  const handleOpenKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onView?.()
    }
  }

  return (
    <div
      className="rounded-3 shadow-sm overflow-hidden h-100 position-relative"
      style={{ background: 'var(--cui-body-bg)', border: '1px solid var(--cui-border-color)' }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={openLabel}
        onClick={onView}
        onKeyDown={handleOpenKeyDown}
        style={{ cursor: 'pointer' }}
      >
        {/* Avatar header */}
        {imageUrl ? (
          <div
            style={{
              height: 120,
              background: '#0f0f0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={imageUrl}
              alt={team.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        ) : (
          <div
            style={{
              height: 80,
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{ fontSize: '2.25rem', fontWeight: 700, color: avatarText, lineHeight: 1 }}
            >
              {initial}
            </span>
          </div>
        )}

        {/* Title row */}
        <div
          className="d-flex justify-content-between align-items-center px-3 py-2"
          style={{
            background: 'var(--cui-tertiary-bg)',
            borderBottom: '1px solid var(--cui-border-color)',
          }}
        >
          <div
            className="d-flex align-items-center gap-2 flex-wrap text-start"
            style={{ minWidth: 0 }}
          >
            <span className="fw-semibold text-break">{team.name || '--'}</span>
            <StatusPill label={badgeLabel} />
          </div>
          {canEdit && <span style={{ width: 22, flexShrink: 0 }} aria-hidden="true" />}
        </div>

        {/* Member rows */}
        {members.length > 0 ? (
          members.map((member) => {
            const badge = getRoleBadge(member.role)
            const label = mapRoleLabel(member.role)
            return (
              <div
                key={member.id ?? member.name}
                className="d-flex justify-content-between align-items-center px-3 py-2"
                style={{ borderBottom: '1px solid var(--cui-border-color)' }}
              >
                <span className="text-body">{member.name || '--'}</span>
                {badge ? (
                  <span
                    className="px-2 py-1 rounded-pill fw-semibold"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                ) : (
                  <span className="text-muted">{label}</span>
                )}
              </div>
            )
          })
        ) : (
          <div className="px-3 py-2 text-muted">
            No members assigned yet. Edit team to assign members.
          </div>
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="btn btn-link text-muted p-1 rounded d-inline-flex align-items-center"
          style={{
            lineHeight: 1,
            position: 'absolute',
            top: imageUrl ? 126 : 86,
            right: 12,
          }}
          title={`Edit ${team.name || 'team'}`}
          aria-label={`Edit ${team.name || 'team'}`}
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  )
}

export default TeamCard
