import React, { useState } from 'react'

export const ACTIONS = {
  CLOSE: 'close',
  NEXT: 'next',
  PREV: 'prev',
  SKIP: 'skip',
}

export const EVENTS = {
  STEP_AFTER: 'step:after',
  TOOLTIP: 'tooltip',
  TARGET_NOT_FOUND: 'error:target_not_found',
}

export const STATUS = {
  FINISHED: 'finished',
  SKIPPED: 'skipped',
}

const clampStepIndex = (index, steps) => {
  if (!steps.length) return 0
  return Math.min(Math.max(Number(index) || 0, 0), steps.length - 1)
}

export const Joyride = ({ onEvent, run, steps = [], tooltipComponent: TooltipComponent }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const safeSteps = Array.isArray(steps) ? steps : []
  const currentStepIndex = clampStepIndex(stepIndex, safeSteps)

  const emit = (payload) => onEvent?.(payload)

  const moveNext = () => {
    emit({
      action: ACTIONS.NEXT,
      index: currentStepIndex,
      type: EVENTS.STEP_AFTER,
    })

    setStepIndex((current) => {
      const next = clampStepIndex(current + 1, safeSteps)
      return next === current ? current : next
    })
  }

  const moveBack = () => {
    emit({
      action: ACTIONS.PREV,
      index: currentStepIndex,
      type: EVENTS.STEP_AFTER,
    })

    setStepIndex((current) => Math.max(0, current - 1))
  }

  const finishTour = () =>
    emit({ status: STATUS.FINISHED, type: 'tour:end', index: safeSteps.length - 1 })

  const skipTour = () =>
    emit({
      status: STATUS.SKIPPED,
      action: ACTIONS.SKIP,
      type: 'tour:end',
      index: currentStepIndex,
    })

  const emitTargetMissing = () =>
    emit({
      action: ACTIONS.NEXT,
      index: currentStepIndex,
      type: EVENTS.TARGET_NOT_FOUND,
    })

  if (!run || safeSteps.length === 0) return null

  return (
    <div data-testid="joyride-running">
      <span hidden data-testid="joyride-step-titles">
        {safeSteps.map((step) => step.title).join(', ')}
      </span>
      {TooltipComponent ? (
        <TooltipComponent
          backProps={{ onClick: moveBack }}
          closeProps={{ onClick: () => emit({ action: ACTIONS.CLOSE, index: currentStepIndex }) }}
          continuous
          index={currentStepIndex}
          primaryProps={{ onClick: moveNext }}
          skipProps={{ onClick: skipTour }}
          size={safeSteps.length}
          step={safeSteps[currentStepIndex]}
          tooltipProps={{}}
        />
      ) : null}
      <button type="button" onClick={finishTour}>
        Done mock tour
      </button>
      <button type="button" onClick={skipTour}>
        Skip mock tour
      </button>
      <button type="button" onClick={emitTargetMissing}>
        Target missing mock
      </button>
    </div>
  )
}

export default {
  ACTIONS,
  EVENTS,
  Joyride,
  STATUS,
  React,
  __esModule: true,
}
