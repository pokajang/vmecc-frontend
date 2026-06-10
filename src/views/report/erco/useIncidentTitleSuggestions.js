import React from 'react'
import { loadReportRecords } from '../reportStorage'
import { formatErcoLocation } from './utils'

const INCIDENT_TITLE_KEYWORD_TEMPLATES = [
  { keywords: ['wild', 'boar'], title: 'Wild boar sighted' },
  { keywords: ['animal'], title: 'Animal sighted' },
  { keywords: ['bee', 'hornet', 'sting'], title: 'Bee / hornet activity sighted' },
  { keywords: ['fire', 'smoke'], title: 'Fire / smoke sighted' },
  { keywords: ['gas', 'leak', 'hazmat', 'chemical'], title: 'Gas leak / hazmat condition sighted' },
  { keywords: ['medical', 'injury', 'sick'], title: 'Medical case reported' },
  { keywords: ['collapse', 'unconscious', 'faint'], title: 'Worker collapse reported' },
  { keywords: ['fall', 'height', 'slip', 'trip'], title: 'Fall incident reported' },
  {
    keywords: ['electrical', 'shock', 'electrocution'],
    title: 'Electrical shock incident reported',
  },
  { keywords: ['confined', 'space', 'trapped'], title: 'Person trapped in confined space' },
  {
    keywords: ['machine', 'machinery', 'entanglement'],
    title: 'Machinery entanglement incident reported',
  },
  { keywords: ['vehicle', 'collision', 'crash'], title: 'Vehicle collision on site reported' },
  { keywords: ['spill', 'exposure', 'toxic'], title: 'Chemical spill / exposure reported' },
  { keywords: ['flood', 'water'], title: 'Flooding reported' },
  { keywords: ['tree', 'debris', 'obstruction'], title: 'Tree / debris obstruction reported' },
  { keywords: ['alarm', 'fda'], title: 'Alarm triggered' },
  { keywords: ['rescue', 'trapped'], title: 'Rescue assistance required' },
]

const DEFAULT_INCIDENT_TITLE_TEMPLATES = [
  '{incidentType} incident reported',
  '{incidentType} assistance required',
  'Safety incident reported',
  'Emergency assistance required',
  'Operations support requested',
  'Worker collapse reported',
  'Injury at worksite reported',
  'Unconscious person reported',
  'Person trapped at height',
  'Gas leak suspected',
  'Chemical spill reported',
  'Toxic exposure suspected',
  'Vehicle collision on site reported',
  'Machinery entanglement incident reported',
  'Flooding at facility reported',
  'Tree / debris obstruction reported',
  'Animal threat sighted',
]

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const tokenize = (value) => normalizeText(value).split(/\s+/).filter(Boolean)

const resolveAreaPreposition = (areaLabel) => {
  const text = normalizeText(areaLabel)
  if (!text) return ''
  if (text.includes('|')) return 'in'
  if (/\b(zone|area|sector|site|location|stockpile)\b/.test(text)) return 'in'
  if (/\b(road|street|highway|lane|track|route)\b/.test(text)) return 'on'
  return 'at'
}

const applyTemplate = (template, { incidentType, areaLabel }) => {
  const base = String(template || '')
    .replaceAll('{incidentType}', incidentType || 'Incident')
    .replace(/\s+/g, ' ')
    .trim()
  if (!areaLabel) return base
  const preposition = resolveAreaPreposition(areaLabel)
  return `${base} ${preposition} ${areaLabel}`
}

const rankSuggestion = (text, queryTokens, incidentType, location) => {
  const normalized = normalizeText(text)
  let score = 0

  if (!normalized) return score
  if (!queryTokens.length) score += 1

  queryTokens.forEach((token) => {
    if (normalized.startsWith(token)) score += 5
    if (normalized.includes(token)) score += 3
  })

  if (incidentType && normalized.includes(normalizeText(incidentType))) score += 2
  if (location && normalized.includes(normalizeText(location))) score += 2

  return score
}

const useIncidentTitleSuggestions = ({ userId, form, titleTypeOptions }) => {
  const [recentIncidentTitles, setRecentIncidentTitles] = React.useState([])

  React.useEffect(() => {
    if (!userId) {
      setRecentIncidentTitles([])
      return
    }

    const rows = loadReportRecords(userId)
    const seen = new Set()
    const next = []

    rows.forEach((row) => {
      if (normalizeText(row?.reportType) !== 'erco') return
      const title = String(row?.details || '').trim()
      if (!title) return
      const key = normalizeText(title)
      if (!key || seen.has(key)) return
      seen.add(key)
      next.push(title)
    })

    setRecentIncidentTitles(next.slice(0, 20))
  }, [userId])

  const incidentTypeValue = String(form?.incidentType || '').trim()
  const locationValue = formatErcoLocation(form?.location)
  const areaLabel = String(locationValue || '').trim()
  const currentTitleValue = String(form?.details || '').trim()
  const currentTitleQueryTokens = React.useMemo(
    () => tokenize(currentTitleValue),
    [currentTitleValue],
  )

  const contextualTemplateEntries = React.useMemo(() => {
    const incidentKey = normalizeText(incidentTypeValue)
    const matched = INCIDENT_TITLE_KEYWORD_TEMPLATES.filter((row) =>
      Array.isArray(row?.keywords)
        ? row.keywords.some((keyword) => incidentKey.includes(normalizeText(keyword)))
        : false,
    ).map((row) => applyTemplate(row.title, { incidentType: incidentTypeValue, areaLabel }))

    const fallback = DEFAULT_INCIDENT_TITLE_TEMPLATES.map((template) =>
      applyTemplate(template, { incidentType: incidentTypeValue, areaLabel }),
    )
    const seen = new Set()
    return [...matched, ...fallback]
      .map((title) => ({
        title,
        description: '',
      }))
      .filter((entry) => {
        const key = normalizeText(entry?.title)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [areaLabel, incidentTypeValue])

  const customIncidentTitles = React.useMemo(
    () =>
      (Array.isArray(titleTypeOptions) ? titleTypeOptions : [])
        .map((row) => ({ title: String(row?.title || row?.value || '').trim() }))
        .filter((row) => Boolean(row.title)),
    [titleTypeOptions],
  )

  const incidentTitleSuggestions = React.useMemo(() => {
    const pool = [
      ...contextualTemplateEntries,
      ...customIncidentTitles,
      ...recentIncidentTitles.map((title) => ({ title, description: '' })),
    ]
    const queryTokens = currentTitleQueryTokens
    const byTitle = new Map()

    pool.forEach((entry) => {
      const title = String(entry?.title || '').trim()
      const key = normalizeText(title)
      if (!key) return
      if (!byTitle.has(key)) byTitle.set(key, { title })
    })

    return Array.from(byTitle.values())
      .filter((entry) => {
        const key = normalizeText(entry?.title)
        if (queryTokens.length === 0) return true
        return queryTokens.every((token) => key.includes(token))
      })
      .map((entry) => ({
        title: entry.title,
        score: rankSuggestion(entry.title, queryTokens, incidentTypeValue, locationValue),
      }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  }, [
    contextualTemplateEntries,
    customIncidentTitles,
    recentIncidentTitles,
    currentTitleQueryTokens,
    incidentTypeValue,
    locationValue,
  ])

  const incidentTitleOptions = React.useMemo(
    () =>
      incidentTitleSuggestions.map((item) => ({
        value: item.title,
        label: item.title,
      })),
    [incidentTitleSuggestions],
  )

  const incidentTitleValueOption = React.useMemo(() => {
    const text = String(form?.details || '').trim()
    if (!text) return null
    const selectedMatch = incidentTitleOptions.find(
      (option) => normalizeText(option.value) === normalizeText(text),
    )
    return selectedMatch || { value: text, label: text }
  }, [form?.details, incidentTitleOptions])

  return {
    incidentTitleOptions,
    incidentTitleValueOption,
  }
}

export default useIncidentTitleSuggestions
