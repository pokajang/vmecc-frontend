const teams = ['Alpha', 'Bravo', 'Charlie', 'Delta']

const getDayName = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

// Generate every other day in 2025 (roughly half the days)
const buildRoster = () => {
  const start = new Date('2025-01-01')
  const end = new Date('2025-12-31')
  const roster = []
  let idx = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 2)) {
    const dateStr = d.toISOString().slice(0, 10)
    const dayShiftTeam = teams[idx % teams.length]
    const nightShiftTeam = teams[(idx + 1) % teams.length]
    roster.push({
      date: dateStr,
      dayName: getDayName(dateStr),
      dayShift: { team: dayShiftTeam },
      nightShift: { team: nightShiftTeam },
    })
    idx++
  }
  return roster
}

export const sampleRoster = buildRoster()
