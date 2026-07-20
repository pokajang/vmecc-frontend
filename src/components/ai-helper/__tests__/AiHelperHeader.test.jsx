// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import AiHelperHeader from '../AiHelperHeader'

vi.mock('@coreui/react', () => ({
  CDropdown: ({ children }) => <div>{children}</div>,
  CDropdownItem: ({ active, children, ...props }) => (
    <button aria-current={active ? 'true' : undefined} {...props}>
      {children}
    </button>
  ),
  CDropdownMenu: ({ children }) => <div>{children}</div>,
  CDropdownToggle: ({ caret, children, ...props }) => (
    <button data-caret={caret} {...props}>
      {children}
    </button>
  ),
  CTooltip: ({ children }) => children,
}))

afterEach(() => {
  cleanup()
})

describe('AiHelperHeader', () => {
  it('provides the panel heading above normalized response section headings', () => {
    render(
      <AiHelperHeader
        historyOpen={false}
        knowledgeOpen={false}
        responseLanguage="auto"
        sending={false}
        onClose={vi.fn()}
        onNewChat={vi.fn()}
        onResponseLanguageChange={vi.fn()}
        onToggleHistory={vi.fn()}
        onToggleKnowledge={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Ask AI' })).toBeTruthy()
  })
})
