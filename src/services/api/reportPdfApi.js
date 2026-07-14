import { buildApiUrl, fetchWithCsrfRetry } from './httpClient'

const readError = async (response) => {
  let message = 'Download failed'
  let code = ''

  try {
    const raw = await response.text()
    if (raw) {
      try {
        const payload = JSON.parse(raw)
        message = payload?.message || message
        code = String(payload?.code || '').trim()
      } catch {
        message = raw
      }
    }
  } catch {
    // Keep the stable fallback when the response body cannot be read.
  }

  const error = new Error(message)
  error.status = response.status
  error.code = code
  return error
}

const decodeFilename = (value) => {
  const filename = String(value || '')
    .trim()
    .replace(/^"|"$/g, '')
  if (!filename) return ''

  try {
    return decodeURIComponent(filename)
  } catch {
    return filename
  }
}

const filenameFromHeaders = (headers) => {
  const disposition = headers.get('content-disposition') || ''
  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (encodedMatch) return decodeFilename(encodedMatch[1])

  const filenameMatch = /filename=("[^"]+"|[^;]+)/i.exec(disposition)
  return decodeFilename(filenameMatch?.[1])
}

export const downloadReportPdf = async ({ endpoint, reportUid }) => {
  const normalizedUid = String(reportUid || '').trim()
  if (!normalizedUid) {
    const error = new Error('Download unavailable until the report is saved.')
    error.status = 400
    throw error
  }

  const response = await fetchWithCsrfRetry(buildApiUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
    },
    body: JSON.stringify({ report_uid: normalizedUid }),
  })

  if (!response.ok) throw await readError(response)

  const contentType = String(response.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('application/pdf')) {
    throw new Error('The server returned an invalid PDF response.')
  }

  const blob = await response.blob()
  if (!blob || blob.size === 0) {
    throw new Error('The generated PDF is empty.')
  }

  return {
    blob,
    filename: filenameFromHeaders(response.headers),
    reportVersion: response.headers.get('x-report-version') || '',
  }
}
