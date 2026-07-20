// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import AiHelperKnowledgeDiagnosticsCard from '../AiHelperKnowledgeDiagnosticsCard'

const diagnostics = {
  enabled: true,
  configured: true,
  queue: { default_connection: 'database' },
  storage: { knowledge_used_bytes: 8192, knowledge_max_total_bytes: 2147483648 },
  knowledge_runtime: {
    retrieval_pipeline_version: 4,
    rerank_enabled: true,
    critical_fact_validation_enabled: true,
    grounding_verification_mode: 'enforce',
    semantic_ready: false,
    usable_sources: 85,
    semantic_sources: 84,
    incompatible_semantic_sources: 1,
    missing_embeddings: 3,
    index_fingerprint: 'v4:text-embedding-3-small:512:routing-v1:contextual-v2',
  },
  recent_failed_uploads: [],
}

describe('AiHelperKnowledgeDiagnosticsCard semantic index status', () => {
  afterEach(cleanup)

  it('shows the configured fingerprint and actionable stale-index counts', () => {
    render(<AiHelperKnowledgeDiagnosticsCard diagnostics={diagnostics} />)

    expect(screen.getByTestId('ai-helper-semantic-status').textContent).toBe('Needs rebuild')
    expect(screen.getByTestId('ai-helper-semantic-source-count').textContent).toContain('84 / 85')

    const card = screen.getByTestId('ai-helper-knowledge-diagnostics')
    expect(within(card).getByText('1 incompatible')).toBeTruthy()
    expect(within(card).getByText('Missing chunk vectors').nextElementSibling?.textContent).toBe(
      '3',
    )
    expect(screen.getByTestId('ai-helper-index-fingerprint').textContent).toBe(
      diagnostics.knowledge_runtime.index_fingerprint,
    )
  })
})
