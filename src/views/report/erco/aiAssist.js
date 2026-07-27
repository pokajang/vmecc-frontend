import { buildAiHelperPageContext } from 'src/components/ai-helper/pageContextContract'
import { formatErcoLocation } from './utils'
import { sortResponders } from './chronologyUtils'

export const AI_REVIEW_STATUS = {
  LOOKS_OK: 'looks_ok',
  NEEDS_ATTENTION: 'needs_attention',
  MISSING_INFORMATION: 'missing_information',
}

export const ERCO_EMBEDDED_TASK = {
  GENERATE_SUMMARY: 'erco_generate_summary',
  IMPROVE_SUMMARY: 'erco_improve_summary',
  REVIEW_REPORT: 'erco_review_report',
}

export const ERCO_AI_MESSAGE_MAX_LENGTH = 12000
export const ERCO_AI_MESSAGE_TOO_LONG =
  'This report is too long for AI assistance. Shorten the summary or continue editing manually.'

const STATUS_LABELS = {
  [AI_REVIEW_STATUS.LOOKS_OK]: 'Looks OK',
  [AI_REVIEW_STATUS.NEEDS_ATTENTION]: 'Needs attention',
  [AI_REVIEW_STATUS.MISSING_INFORMATION]: 'Missing information',
}

const ALLOWED_REVIEW_STATUSES = new Set(Object.values(AI_REVIEW_STATUS))

export const compactText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const compactList = (value) =>
  (Array.isArray(value) ? value : []).map((item) => compactText(item)).filter(Boolean)

const buildResponderRows = (rows) =>
  sortResponders(Array.isArray(rows) ? rows : [])
    .filter((row) => row?.present)
    .map((row) => ({
      name: compactText(row?.name),
      role: compactText(row?.role),
      team: compactText(row?.teamName),
    }))
    .filter((row) => row.name || row.role || row.team)

const buildChronologyRows = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      time: compactText(row?.time),
      action: compactText(row?.action),
    }))
    .filter((row) => row.time || row.action)

const buildPhotoRows = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((photo) => ({
      fileName: compactText(photo?.fileName),
      description: compactText(photo?.description),
    }))
    .filter((photo) => photo.fileName || photo.description)

export const buildErcoAiPayload = ({
  form,
  teamLabel,
  shiftLabel,
  respondersSummaryValue,
  chronologyRows,
}) => {
  const analysis = form?.postIncidentAnalysis || {}
  const responders = buildResponderRows(form?.respondingAttendance)

  return {
    reportType: 'erco',
    summary: compactText(form?.summary),
    incident: {
      title: compactText(form?.details),
      type: compactText(form?.incidentType),
      weather: compactText(form?.weather),
      location: formatErcoLocation(form?.location),
      date: compactText(form?.incidentDate),
      time: compactText(form?.incidentTime),
    },
    response: {
      team: compactText(teamLabel),
      shift: compactText(shiftLabel),
      responders,
      respondersSummary: compactText(respondersSummaryValue),
    },
    chronology: buildChronologyRows(chronologyRows),
    postIncidentAnalysis: {
      resourcesMobilised: compactList(analysis.resourcesMobilised),
      strengths: compactList(analysis.strengths),
      improvementOpportunities: compactList(analysis.improvementOpportunities),
      photos: buildPhotoRows(analysis.photos),
    },
  }
}

const jsonBlock = (payload) => JSON.stringify(payload)

export const buildErcoAiContext = () =>
  buildAiHelperPageContext({
    path:
      typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '/report/erco',
    moduleKey: 'reports',
    routeKey: 'reports.erco.form',
    title: 'ERCO Report Form',
    params: {
      report_type: 'erco',
    },
  })

export const assertErcoAiMessageWithinLimit = (message) => {
  const value = String(message || '')
  if (value.length <= ERCO_AI_MESSAGE_MAX_LENGTH) return value

  const error = new Error(ERCO_AI_MESSAGE_TOO_LONG)
  error.code = 'AI_HELPER_MESSAGE_TOO_LONG'
  throw error
}

export const buildErcoSummaryPrompt = (payload, mode = 'generate') => {
  const isImproveMode = mode === 'improve'

  return [
    isImproveMode
      ? 'Improve the existing ERCO emergency response incident summary for a VMECC report.'
      : 'Generate an ERCO emergency response incident summary for a VMECC report.',
    'Return only the final summary text. Do not include markdown, bullets, headings, labels, or commentary.',
    'Use a concise professional operations-log tone in English.',
    'Use only the supplied ERCO report facts. Do not invent facts, causes, injuries, damage, completion status, or approvals.',
    'Do not include unrelated HSE, inspection, payroll, leave, or other module content.',
    'If a fact is missing, omit it rather than writing unknown, pending, or N/A.',
    isImproveMode
      ? 'Preserve the original meaning and facts. Improve clarity only.'
      : 'Keep the summary to 1-2 short paragraphs.',
    '',
    'ERCO report payload:',
    jsonBlock(payload),
  ].join('\n')
}

export const buildErcoReviewPrompt = (payload) =>
  [
    'Check this ERCO report for possible missing or unclear information before submission.',
    'This is advisory only. Do not rewrite the report and do not block submission.',
    'Use only the supplied ERCO report facts. Do not invent facts.',
    'Focus on chronology gaps, vague actions, missing demobilisation/RTB, summary-data mismatch, missing responders, missing location/date/time, and missing post-incident analysis where relevant.',
    'Do not include unrelated HSE, inspection, payroll, leave, or other module content.',
    'Return strict JSON only in this shape:',
    '{"items":[{"status":"looks_ok|needs_attention|missing_information","message":"short plain-language suggestion"}]}',
    'Use at most 6 items. If no issues are found, return one looks_ok item.',
    '',
    'ERCO report payload:',
    jsonBlock(payload),
  ].join('\n')

export const normalizeGeneratedSummary = (value) =>
  compactText(value && typeof value === 'object' ? value.summary : value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^(incident summary|summary)\s*:\s*/i, '')
    .trim()

const extractJsonObject = (value) => {
  const text = String(value || '').trim()
  if (!text) return null
  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return withoutFence.slice(start, end + 1)
}

export const normalizeReviewStatus = (status) => {
  const value = compactText(status).toLowerCase()
  return ALLOWED_REVIEW_STATUSES.has(value) ? value : AI_REVIEW_STATUS.NEEDS_ATTENTION
}

export const reviewStatusLabel = (status) =>
  STATUS_LABELS[normalizeReviewStatus(status)] || STATUS_LABELS[AI_REVIEW_STATUS.NEEDS_ATTENTION]

export const parseAiReviewItems = (value) => {
  const structuredValue = value && typeof value === 'object' ? value : null
  const jsonText = structuredValue ? null : extractJsonObject(value)
  if (!structuredValue && !jsonText) {
    const fallbackMessage = compactText(value)
    return fallbackMessage
      ? [{ status: AI_REVIEW_STATUS.NEEDS_ATTENTION, message: fallbackMessage }]
      : []
  }

  try {
    const parsed = structuredValue || JSON.parse(jsonText)
    const rows = Array.isArray(parsed?.items) ? parsed.items : []
    return rows
      .map((row) => ({
        status: normalizeReviewStatus(row?.status),
        message: compactText(row?.message),
      }))
      .filter((row) => row.message)
      .slice(0, 6)
  } catch {
    return []
  }
}
