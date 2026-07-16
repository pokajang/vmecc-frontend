import { useEffect, useRef } from 'react'

import { CTooltip } from '@coreui/react'
import { Loader, Trash2 } from 'lucide-react'

import { formatFileSize, formatKnowledgeDate, knowledgeEntryName } from './constants'

const KnowledgeListView = ({
  authUser,
  canManageKnowledge = false,
  knowledgeDeleteTarget,
  knowledgeEntries,
  knowledgeInitialLoading,
  knowledgeLoading,
  knowledgeUpdatingId,
  onConfirmDeleteKnowledge,
  onKnowledgeDeleteTargetChange,
  onLoadKnowledge,
  onOpenKnowledge,
}) => {
  const confirmationRef = useRef(null)

  useEffect(() => {
    if (!knowledgeDeleteTarget || !confirmationRef.current) return

    confirmationRef.current.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    })
  }, [knowledgeDeleteTarget])

  return (
    <section className="ai-helper-knowledge__section" aria-busy={knowledgeLoading}>
      <div className="ai-helper-knowledge__section-header">
        <div className="ai-helper-knowledge__section-title">Document library</div>
        <button type="button" onClick={onLoadKnowledge} disabled={knowledgeLoading}>
          {knowledgeLoading ? (
            <>
              <Loader size={14} className="icon-spin" aria-hidden="true" />
              Refreshing
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {knowledgeInitialLoading ? (
        <div className="ai-helper-knowledge__list" aria-label="Loading document library">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="ai-helper-knowledge__item ai-helper-knowledge__item--loading"
            >
              <div className="ai-helper-knowledge__item-main">
                <div className="ai-helper-knowledge__skeleton ai-helper-knowledge__skeleton--title" />
                <div className="ai-helper-knowledge__skeleton ai-helper-knowledge__skeleton--meta" />
                <div className="ai-helper-knowledge__skeleton ai-helper-knowledge__skeleton--meta-short" />
              </div>
              <div className="ai-helper-knowledge__actions">
                <div className="ai-helper-knowledge__skeleton ai-helper-knowledge__skeleton--icon" />
              </div>
            </div>
          ))}
        </div>
      ) : knowledgeEntries.length ? (
        <>
          {knowledgeLoading ? (
            <div className="ai-helper-knowledge__loading-inline" aria-live="polite">
              <Loader size={14} className="icon-spin" aria-hidden="true" />
              <span>Updating document library...</span>
            </div>
          ) : null}
          <div
            className={`ai-helper-knowledge__list${
              knowledgeLoading ? ' ai-helper-knowledge__list--refreshing' : ''
            }`}
          >
            {knowledgeEntries.map((entry) => {
              const canDeleteKnowledge =
                canManageKnowledge || Number(entry.uploaded_by) === Number(authUser?.id)
              const isDeleteTarget =
                String(knowledgeDeleteTarget?.id ?? '') === String(entry.id ?? '')
              return (
                <div
                  key={entry.id}
                  className={`ai-helper-knowledge__item${
                    isDeleteTarget ? ' ai-helper-knowledge__item--delete-confirmation' : ''
                  }`}
                >
                  {isDeleteTarget ? (
                    <div
                      ref={confirmationRef}
                      className="ai-helper-knowledge__delete-confirmation"
                      role="group"
                      aria-label={`Delete ${knowledgeEntryName(entry)} confirmation`}
                    >
                      <div className="ai-helper-knowledge__delete-confirmation-prompt">
                        Delete <span>{`"${knowledgeEntryName(entry)}"?`}</span>
                      </div>
                      <div className="ai-helper-history-confirm__actions">
                        <button
                          type="button"
                          onClick={() => onKnowledgeDeleteTargetChange(null)}
                          disabled={Boolean(knowledgeUpdatingId)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={onConfirmDeleteKnowledge}
                          disabled={Boolean(knowledgeUpdatingId)}
                        >
                          {knowledgeUpdatingId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ai-helper-knowledge__open"
                        onClick={() => onOpenKnowledge(entry.id)}
                        aria-label={`Open ${knowledgeEntryName(entry)}`}
                      >
                        <div className="ai-helper-knowledge__item-main">
                          <CTooltip content={knowledgeEntryName(entry)} placement="top">
                            <div className="ai-helper-knowledge__title">
                              {knowledgeEntryName(entry)}
                            </div>
                          </CTooltip>
                          <div className="ai-helper-knowledge__meta">
                            <span>File</span> {entry.source_filename || 'PDF document'}
                          </div>
                          <div className="ai-helper-knowledge__meta">
                            <span>Uploaded by</span> {entry.uploader_name || 'Unknown user'}
                            {entry.created_at ? ` - ${formatKnowledgeDate(entry.created_at)}` : ''}
                            {entry.source_size ? ` - ${formatFileSize(entry.source_size)}` : ''}
                          </div>
                          <div className="ai-helper-knowledge__meta">
                            <span>Availability</span>{' '}
                            {entry.visibility === 'shared' ? 'Everyone' : 'Only me'}
                          </div>
                        </div>
                      </button>
                      {canDeleteKnowledge ? (
                        <div className="ai-helper-knowledge__actions">
                          <button
                            type="button"
                            className="ai-helper-knowledge__delete"
                            onClick={(event) => {
                              event.stopPropagation()
                              onKnowledgeDeleteTargetChange(entry)
                            }}
                            disabled={knowledgeUpdatingId === entry.id}
                            aria-label={`Delete ${knowledgeEntryName(entry)}`}
                            title="Delete document"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {knowledgeLoading ? (
            <div className="ai-helper-knowledge__loading-inline" aria-live="polite">
              <Loader size={14} className="icon-spin" aria-hidden="true" />
              <span>Updating document library...</span>
            </div>
          ) : null}
          <div className="ai-helper-history__empty">No reference documents uploaded yet.</div>
        </>
      )}
    </section>
  )
}

export default KnowledgeListView
