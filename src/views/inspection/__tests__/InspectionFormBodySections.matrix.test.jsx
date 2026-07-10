// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import InspectionFormBodySections from '../form/components/InspectionFormBodySections'
import { PARTIAL_STATE_PROMPTS } from '../inspectionFormUiTokens'
import {
  buildInspectionBodyCase,
  buildInspectionBodyMatrix,
  EVIDENCE_CLASSES,
  NEXT_LABELS,
  UI_CLASSES,
} from '../visual/inspectionFormStateMatrix'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const renderBodySections = (props) => render(<InspectionFormBodySections {...props} />)

const matrix = buildInspectionBodyMatrix()

afterEach(() => {
  cleanup()
  delete window.matchMedia
})

describe('InspectionFormBodySections cross-form in-form continuation matrix', () => {
  it.each(matrix)(
    '$state state keeps shared continuation behavior for $definition.inspectionType [$viewport]',
    ({ definition, state, viewport }) => {
      const { props, expectation, onSelectNextScope } = buildInspectionBodyCase(definition, state, {
        createMock: () => vi.fn(),
      })

      if (viewport === 'mobile') {
        setMobileViewport()
      }

      const { container } = renderBodySections(props)

      if (expectation.promptText) {
        expect(screen.getByText(expectation.promptText)).toBeTruthy()
      } else {
        Object.values(PARTIAL_STATE_PROMPTS).forEach((promptText) => {
          expect(screen.queryByText(promptText)).toBeNull()
        })
      }

      const actionButtons = [
        ...screen.queryAllByRole('button', {
          name: /Continue to Review|Continue to Review Updates/,
        }),
        ...screen.queryAllByRole('button', { name: /Save Draft|Save Update Draft/ }),
      ]
      const hasActionButton = actionButtons.length > 0
      const showExpectedActions = Boolean(expectation.hasActions)
      const actionShell = container.querySelector(`.${UI_CLASSES.actions}`)
      const inlineActionShell = container.querySelector(`.${UI_CLASSES.inlineActions}`)
      const actionSpacer = container.querySelector(`.${UI_CLASSES.inlineActionSpacer}`)
      const nextLocationShell = container.querySelector(`.${UI_CLASSES.nextLocationCard}`)

      if (showExpectedActions) {
        expect(hasActionButton).toBe(true)
        expect(actionShell).toBeTruthy()
        expect(inlineActionShell).toBeTruthy()
        expect(actionSpacer).toBeTruthy()
        if (expectation.hasNextLocation && nextLocationShell) {
          expect(actionShell.contains(nextLocationShell)).toBe(false)
        }
      } else {
        expect(hasActionButton).toBe(false)
        expect(container.querySelector(`.${UI_CLASSES.inlineActions}`)).toBeNull()
      }

      if (expectation.hasNextLocation) {
        const nextLabel = expectation.continuationLabel
        const nextLocationActionButton = screen.getByRole('button', {
          name: expectation.continuationNextValue,
        })
        const nextCard = screen.getByText(nextLabel)
        expect(nextCard).toBeTruthy()
        expect(nextLocationShell).toBeTruthy()
        expect(nextLocationActionButton).toBeTruthy()
        expect(nextLocationShell.querySelector(`.${UI_CLASSES.nextLocationOptions}`)).toBeTruthy()

        const evidence = EVIDENCE_CLASSES.map((className) =>
          container.querySelector(`.${className}`),
        ).find(Boolean)
        if (!evidence) {
          throw new Error('Expected evidence section to be rendered')
        }
        expect(evidence.compareDocumentPosition(nextLocationShell)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
        expect(actionShell).toBeTruthy()
        expect(inlineActionShell).toBeTruthy()

        if (expectation.shouldHaveOrder) {
          const structuredSection = screen.getByTestId('structured-section')
          expect(structuredSection.compareDocumentPosition(evidence)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          )
          expect(structuredSection.compareDocumentPosition(nextCard)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          )
        }

        if (expectation.canSelectNext) {
          fireEvent.click(screen.getByRole('button', { name: expectation.continuationNextValue }))
          expect(onSelectNextScope).toHaveBeenCalledWith(
            expect.objectContaining({ value: expectation.continuationNextValue }),
          )
        }
      } else {
        NEXT_LABELS.forEach((label) => {
          expect(screen.queryByText(label)).toBeNull()
        })
      }
    },
  )
})

describe('InspectionFormBodySections cross-form in-form state snapshots', () => {
  it.each(matrix)(
    '$state state visual baseline for $definition.inspectionType [$viewport]',
    ({ definition, state, viewport }) => {
      const { props } = buildInspectionBodyCase(definition, state)

      if (viewport === 'mobile') {
        setMobileViewport()
      }

      const { container } = renderBodySections(props)

      expect(container).toMatchSnapshot(`/${viewport}/${definition.key}/${state}`)
    },
  )
})
