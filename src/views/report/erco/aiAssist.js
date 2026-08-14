import { buildAiHelperPageContext } from 'src/components/ai-helper/pageContextContract'
import { formatErcoLocation } from './utils'
import { sortResponders } from './chronologyUtils'

export const ERCO_EMBEDDED_TASK = {
  GENERATE_SUMMARY: 'erco_generate_summary',
  IMPROVE_SUMMARY: 'erco_improve_summary',
}

export const ERCO_AI_MESSAGE_MAX_LENGTH = 12000
export const ERCO_AI_MESSAGE_TOO_LONG =
  'This report is too long for AI assistance. Shorten the summary or continue editing manually.'

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

export const normalizeGeneratedSummary = (value) =>
  compactText(value && typeof value === 'object' ? value.summary : value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^(incident summary|summary)\s*:\s*/i, '')
    .trim()
