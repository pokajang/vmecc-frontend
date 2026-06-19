import { describe, expect, it } from 'vitest'
import rosterFlowReducer, { initialRosterFlowState } from '../rosterFlowReducer'

describe('rosterFlowReducer', () => {
  it('tracks edit and dirty state', () => {
    const editing = rosterFlowReducer(initialRosterFlowState, {
      type: 'set-edit-mode',
      value: true,
    })
    const dirty = rosterFlowReducer(editing, { type: 'set-dirty', value: true })

    expect(dirty).toMatchObject({ editMode: true, isDirty: true })
    expect(rosterFlowReducer(dirty, { type: 'reset-edit' })).toMatchObject({
      editMode: false,
      isDirty: false,
    })
  })

  it('tracks save, publish, and feedback states', () => {
    const saving = rosterFlowReducer(initialRosterFlowState, { type: 'start-save-draft' })
    expect(saving).toMatchObject({ isSavingDraft: true, error: null })

    const published = rosterFlowReducer(saving, {
      type: 'set-status-message',
      message: 'Saved',
    })
    expect(published.statusMessage).toBe('Saved')

    const publishing = rosterFlowReducer(published, { type: 'start-publish' })
    expect(publishing).toMatchObject({ isPublishing: true, error: null })
    expect(rosterFlowReducer(publishing, { type: 'finish-publish' }).isPublishing).toBe(false)
  })
})
