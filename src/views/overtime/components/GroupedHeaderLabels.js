import React from 'react'

const AVATAR_PALETTE = [
  { bg: 'rgba(210, 244, 255, 0.5)', color: 'rgb(10, 71, 90)' },
  { bg: 'rgba(255, 236, 186, 0.5)', color: 'rgb(110, 70, 0)' },
  { bg: 'rgba(255, 214, 222, 0.5)', color: 'rgb(116, 30, 49)' },
  { bg: 'rgba(228, 236, 244, 0.5)', color: 'rgb(53, 71, 88)' },
]

const hashText = (value = '') => {
  let hash = 0
  const normalized = String(value || '')
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

const toInitials = (value = '') => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const getAvatarColors = (value = '') => {
  const index = hashText(value) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[index]
}

const CountBadge = ({ count = 0, noun = 'records' }) => (
  <span className="badge rounded-pill bg-body-tertiary text-body-secondary fw-normal">
    {count} {noun}
  </span>
)

export const MonthGroupLabel = ({
  label = '',
  count = 0,
  countNoun = 'records',
  testId = 'ot-month-group-label',
  className = '',
}) => {
  const monthLabel = String(label || 'Unknown month').toUpperCase()
  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`.trim()} data-testid={testId}>
      <span
        className="text-body-secondary fw-semibold small"
        style={{ letterSpacing: '0.06em' }}
        data-testid={`${testId}-month`}
      >
        {monthLabel}
      </span>
      <CountBadge count={count} noun={countNoun} />
    </div>
  )
}

export const UserGroupLabel = ({
  name = '',
  count = 0,
  countNoun = 'records',
  avatarUrl = '',
  testId = 'ot-user-group-label',
  className = '',
}) => {
  const safeName = String(name || '').trim() || 'Unknown'
  const initials = toInitials(safeName)
  const colors = getAvatarColors(safeName)
  const hasAvatar = String(avatarUrl || '').trim() !== ''

  return (
    <div className={`d-inline-flex align-items-center gap-2 ${className}`.trim()} data-testid={testId}>
      {hasAvatar ? (
        <img
          src={avatarUrl}
          alt={`${safeName} avatar`}
          width={26}
          height={26}
          className="rounded-circle object-fit-cover"
          data-testid={`${testId}-avatar`}
        />
      ) : (
        <span
          className="rounded-circle d-inline-flex align-items-center justify-content-center fw-semibold"
          style={{
            width: '26px',
            height: '26px',
            fontSize: '11px',
            backgroundColor: colors.bg,
            color: colors.color,
          }}
          data-testid={`${testId}-avatar`}
        >
          {initials}
        </span>
      )}
      <span className="text-body-secondary fw-semibold" data-testid={`${testId}-name`}>
        {safeName}
      </span>
      <CountBadge count={count} noun={countNoun} />
    </div>
  )
}
