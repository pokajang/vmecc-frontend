export const validateRosterAssignment = ({ roster = [], date, shiftSlug, teamId }) => {
  if (teamId === null || typeof teamId === 'undefined' || teamId === '') return { ok: true }

  const existing = (Array.isArray(roster) ? roster : []).find((row) => row.date === date)
  const conflict = Object.entries(existing?.shifts || {}).find(
    ([slug, shift]) =>
      slug !== shiftSlug && shift?.team_id && String(shift.team_id) === String(teamId),
  )

  if (!conflict) return { ok: true }

  return {
    ok: false,
    field: `${date}:${shiftSlug}`,
    message: 'A team cannot be assigned to more than one shift on the same date.',
    conflictShift: conflict[0],
  }
}
