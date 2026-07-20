const path = require('node:path')

const runId = process.env.E2E_RUN_ID || process.env.VMECC_SMOKE_RUN_ID || ''

const evidenceRoot = process.env.VMECC_E2E_EVIDENCE_DIR
  ? path.resolve(process.env.VMECC_E2E_EVIDENCE_DIR)
  : runId
    ? path.resolve(process.cwd(), '..', '.qa', runId, 'evidence', 'custom')
    : path.resolve(process.cwd(), 'test-results')

const evidencePath = (...segments) => path.join(evidenceRoot, ...segments)

module.exports = { evidencePath, evidenceRoot }
