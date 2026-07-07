const compactText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const jsonBlock = (payload) => JSON.stringify(payload, null, 2)

export const buildInspectionFindingAiContext = (payload = {}) => ({
  assistant_surface: 'embedded_helper',
  conversation_purpose: 'embedded_helper',
  module_key: 'inspection',
  route_key: 'inspection.form.finding',
  title: 'Inspection Finding',
  path:
    typeof window !== 'undefined' && window.location?.pathname
      ? window.location.pathname
      : '/inspection',
  inspection_type: compactText(payload.inspectionType),
  location: {
    zone: compactText(payload.zone),
    main_area: compactText(payload.mainLocation),
    location: compactText(payload.subLocation),
  },
})

export const buildInspectionFindingTranslatePrompt = (payload = {}) =>
  [
    'Translate and polish this General/HSE inspection finding into concise professional English.',
    'Return strict JSON only in this exact shape:',
    '{"description":"...","actionRequired":"..."}',
    'Translate/rewrite only what the user typed. Do not invent findings, causes, severity, dates, responsible parties, deadlines, completion status, or extra corrective actions.',
    'If actionRequired is blank, return an empty string for actionRequired.',
    'If text is unclear, keep the wording conservative and avoid adding assumptions.',
    'Do not include markdown, labels, commentary, or code fences.',
    '',
    'Finding payload:',
    jsonBlock({
      inspectionType: compactText(payload.inspectionType),
      zone: compactText(payload.zone),
      mainLocation: compactText(payload.mainLocation),
      subLocation: compactText(payload.subLocation),
      description: compactText(payload.description),
      actionRequired: compactText(payload.actionRequired),
    }),
  ].join('\n')

const AI_FIELD_LABELS = {
  description: 'finding description',
  actionRequired: 'action required',
}

export const buildInspectionFindingFieldTranslatePrompt = (payload = {}) =>
  [
    `Translate and polish this General/HSE inspection ${AI_FIELD_LABELS[payload.field] || 'finding field'} into concise professional English.`,
    'Return strict JSON only in this exact shape:',
    '{"text":"..."}',
    'Translate/rewrite only what the user typed in sourceText.',
    'Do not invent findings, causes, severity, dates, responsible parties, deadlines, completion status, or extra corrective actions.',
    'If sourceText is blank, return an empty string for text.',
    'If text is unclear, keep the wording conservative and avoid adding assumptions.',
    'Do not include markdown, labels, commentary, or code fences.',
    '',
    'Field payload:',
    jsonBlock({
      inspectionType: compactText(payload.inspectionType),
      zone: compactText(payload.zone),
      mainLocation: compactText(payload.mainLocation),
      subLocation: compactText(payload.subLocation),
      field: compactText(payload.field),
      sourceText: compactText(payload.sourceText),
    }),
  ].join('\n')

const extractJsonObject = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  return withoutFence.slice(start, end + 1)
}

export const parseTranslatedFinding = (value) => {
  const jsonText = extractJsonObject(value)
  if (!jsonText) return null

  try {
    const parsed = JSON.parse(jsonText)
    const description = compactText(parsed?.description)
    const actionRequired = compactText(parsed?.actionRequired)
    if (!description && !actionRequired) return null
    return { description, actionRequired }
  } catch {
    return null
  }
}

export const parseTranslatedFindingField = (value) => {
  const jsonText = extractJsonObject(value)
  if (!jsonText) return ''

  try {
    const parsed = JSON.parse(jsonText)
    return compactText(parsed?.text)
  } catch {
    return ''
  }
}
