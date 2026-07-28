import { createFitnessParticipant } from './fitnessFormDomain'

const text = (value) => String(value ?? '').trim()
const normalized = (value) => text(value).toLowerCase()
const STANDARD_SHIFT_ORDER = ['alpha', 'bravo', 'charlie', 'delta']

export const fitnessMemberKey = (member) =>
  normalized(member?.memberId || member?.userId || member?.user_id || member?.id || member?.name)

const shiftRank = (name) => {
  const key = normalized(name)
  const rank = STANDARD_SHIFT_ORDER.findIndex(
    (shift) => key === shift || key === `${shift} team` || key === `team ${shift}`,
  )
  return rank < 0 ? STANDARD_SHIFT_ORDER.length : rank
}

export const sortFitnessTeams = (teams) =>
  [...(Array.isArray(teams) ? teams : [])].sort((a, b) => {
    const rankDifference = shiftRank(a?.name || a?.shift) - shiftRank(b?.name || b?.shift)
    if (rankDifference) return rankDifference
    return text(a?.name || a?.shift).localeCompare(text(b?.name || b?.shift), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })

export const normalizeFitnessTeams = (response) => {
  const seenMembers = new Set()
  const teams = sortFitnessTeams(Array.isArray(response?.data) ? response.data : [])
  return teams
    .map((team) => ({
      id: text(team?.id || team?.name),
      name: text(team?.name) || 'Unassigned shift',
      members: (Array.isArray(team?.members) ? team.members : [])
        .filter((member) => !text(member?.ended_at || member?.endedAt))
        .map((member, index) => ({
          memberId: text(member?.user_id || member?.userId || member?.id),
          name: text(member?.name || member?.email),
          role: text(member?.role),
          birthDate: member?.birth_date || member?.dateOfBirth || member?.date_of_birth || '',
          age: member?.age ?? '',
          source: 'roster',
          order: index,
        }))
        .filter((member) => {
          const key = fitnessMemberKey(member)
          if (!member.name || !key || seenMembers.has(key)) return false
          seenMembers.add(key)
          return true
        }),
    }))
    .filter((team) => team.members.length)
}

const mergeRosterParticipant = (member, saved, reportingMonth, order) => {
  const base = createFitnessParticipant(member, reportingMonth, order)
  if (!saved) return base
  return {
    ...base,
    ...saved,
    memberId: base.memberId,
    name: base.name,
    role: base.role || saved.role,
    source: 'roster',
    order,
    rosterStatus: '',
    fitness: { ...base.fitness, ...saved.fitness },
    proficiency: { ...base.proficiency, ...saved.proficiency },
  }
}

export const mergeFitnessTeamsIntoForm = (form, teams) => {
  const currentGroups = Array.isArray(form?.shiftGroups) ? form.shiftGroups : []
  const excluded = new Set(
    (Array.isArray(form?.excludedMemberKeys) ? form.excludedMemberKeys : [])
      .map(normalized)
      .filter(Boolean),
  )
  const savedByMember = new Map()
  const currentTeamMemberKeys = new Set()

  currentGroups.forEach((group) => {
    const participants = Array.isArray(group?.participants) ? group.participants : []
    participants.forEach((participant) => {
      if (participant?.source === 'manual') return
      const key = fitnessMemberKey(participant)
      if (key) savedByMember.set(key, { participant, shift: group.shift })
    })
  })

  const nextGroups = sortFitnessTeams(teams).map((team) => {
    const savedGroup = currentGroups.find(
      (group) => normalized(group?.shift) === normalized(team.name),
    )
    const participants = team.members
      .map((member, index) => {
        const key = fitnessMemberKey(member)
        if (!key) return null
        currentTeamMemberKeys.add(key)
        if (excluded.has(key)) return null
        return mergeRosterParticipant(
          member,
          savedByMember.get(key)?.participant,
          form.reportingMonth,
          index,
        )
      })
      .filter(Boolean)
    const manualParticipants = (savedGroup?.participants || []).filter(
      (participant) => participant.source === 'manual',
    )
    return {
      id: text(savedGroup?.id || team.id || team.name),
      shift: team.name,
      assessor: savedGroup?.assessor || { userId: '', name: '' },
      participants: [...participants, ...manualParticipants],
    }
  })

  currentGroups.forEach((group) => {
    const nextGroup = nextGroups.find(
      (candidate) => normalized(candidate.shift) === normalized(group.shift),
    )
    const preserved = (group.participants || []).filter((participant) => {
      if (participant.source === 'manual') return !nextGroup
      const key = fitnessMemberKey(participant)
      return key && !currentTeamMemberKeys.has(key) && !excluded.has(key)
    })
    if (!preserved.length) return
    const unavailable = preserved.map((participant) => ({
      ...participant,
      rosterStatus: participant.source === 'manual' ? '' : 'unavailable',
    }))
    if (nextGroup) {
      nextGroup.participants.push(...unavailable)
    } else {
      nextGroups.push({ ...group, participants: unavailable })
    }
  })

  return {
    ...form,
    shiftGroups: nextGroups.filter(
      (group) => group.participants.length || text(group.assessor?.name),
    ),
    excludedMemberKeys: [...excluded],
  }
}

export const setFitnessMembersIncluded = (form, team, memberKeys, included) => {
  const keys = new Set((Array.isArray(memberKeys) ? memberKeys : [memberKeys]).map(normalized))
  const excluded = new Set(
    (Array.isArray(form?.excludedMemberKeys) ? form.excludedMemberKeys : []).map(normalized),
  )
  keys.forEach((key) => (included ? excluded.delete(key) : excluded.add(key)))

  const savedTargets = new Map()
  const currentGroups = form.shiftGroups || []
  const savedSnapshots = Array.isArray(form.excludedParticipantSnapshots)
    ? form.excludedParticipantSnapshots
    : []
  savedSnapshots.forEach((participant) => {
    const key = fitnessMemberKey(participant)
    if (keys.has(key)) savedTargets.set(key, participant)
  })
  currentGroups.forEach((group) => {
    group.participants.forEach((participant) => {
      const key = fitnessMemberKey(participant)
      if (participant.source !== 'manual' && keys.has(key)) savedTargets.set(key, participant)
    })
  })

  const withoutTargets = currentGroups
    .map((group) => ({
      ...group,
      participants: group.participants.filter(
        (participant) =>
          participant.source === 'manual' || !keys.has(fitnessMemberKey(participant)),
      ),
    }))
    .filter((group) => group.participants.length || text(group.assessor?.name))

  if (!included) {
    const newSnapshots = currentGroups.flatMap((group) =>
      group.participants
        .filter(
          (participant) =>
            participant.source !== 'manual' && keys.has(fitnessMemberKey(participant)),
        )
        .map((participant) => ({ ...participant, shift: group.shift })),
    )
    const snapshotMap = new Map(
      [...savedSnapshots, ...newSnapshots].map((participant) => [
        fitnessMemberKey(participant),
        participant,
      ]),
    )
    return {
      ...form,
      shiftGroups: withoutTargets,
      excludedMemberKeys: [...excluded],
      excludedParticipantSnapshots: [...snapshotMap.values()],
    }
  }

  const targetMembers = team.members.filter((member) => keys.has(fitnessMemberKey(member)))
  if (!targetMembers.length) return { ...form, excludedMemberKeys: [...excluded] }
  const groupIndex = withoutTargets.findIndex(
    (group) => normalized(group.shift) === normalized(team.name),
  )
  const existingGroup = withoutTargets[groupIndex] || {
    id: text(team.id || team.name),
    shift: team.name,
    assessor: { userId: '', name: '' },
    participants: [],
  }
  const additions = targetMembers.map((member, index) =>
    mergeRosterParticipant(
      member,
      savedTargets.get(fitnessMemberKey(member)),
      form.reportingMonth,
      existingGroup.participants.length + index,
    ),
  )
  const nextGroup = {
    ...existingGroup,
    participants: [...existingGroup.participants, ...additions],
  }
  const shiftGroups =
    groupIndex >= 0
      ? withoutTargets.map((group, index) => (index === groupIndex ? nextGroup : group))
      : [...withoutTargets, nextGroup]

  return {
    ...form,
    shiftGroups: sortFitnessTeams(shiftGroups),
    excludedMemberKeys: [...excluded],
    excludedParticipantSnapshots: savedSnapshots.filter(
      (participant) => !keys.has(fitnessMemberKey(participant)),
    ),
  }
}
