/**
 * Lightweight structured logger.
 *
 * Writes to console.error in all environments and maintains a capped
 * in-memory ring buffer (window.__appLogs) so support can run
 *   copy(JSON.stringify(window.__appLogs, null, 2))
 * in DevTools to capture recent errors without needing a deployed backend.
 *
 * To integrate an external service (e.g. Sentry), replace the body of
 * `reportToService` with:
 *   import * as Sentry from '@sentry/react'
 *   Sentry.captureException(error, { extra: context })
 */

const MAX_LOG_BUFFER = 100

const buffer = []

if (typeof window !== 'undefined') {
  window.__appLogs = buffer
}

const reportToService = (_error, _context) => {
  // TODO: swap for Sentry.captureException / Datadog.addError when provisioned
}

/**
 * Log an error with optional context object.
 * @param {string} tag   — e.g. '[Messages]', '[useMessageThreads]'
 * @param {Error|unknown} error
 * @param {object} [context]
 */
export const logError = (tag, error, context = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    tag,
    message: error?.message || String(error),
    status: error?.status ?? undefined,
    context,
  }

  // Ring buffer — drop oldest when full
  if (buffer.length >= MAX_LOG_BUFFER) buffer.shift()
  buffer.push(entry)

  console.error(tag, error, Object.keys(context).length ? context : '')

  reportToService(error, { tag, ...context })
}
