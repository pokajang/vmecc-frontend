import { useEffect, useState } from 'react'
import { listErcoDrafts, loadReportDraft } from '../reportStorage'
import { buildDraftRow } from '../reportDraftDomain'

const useActiveReportDraftRows = ({ activeFormSlug, draftVersion, reportTypeLabel, user }) => {
  const [activeDraftRows, setActiveDraftRows] = useState([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id || !activeFormSlug) {
        if (!cancelled) setActiveDraftRows([])
        return
      }
      if (activeFormSlug === 'erco') {
        const drafts = await listErcoDrafts(user.id, { limit: 50, page: 1 })
        if (cancelled) return
        const rows = drafts
          .map((draft) =>
            buildDraftRow({
              draft,
              reportTypeSlug: activeFormSlug,
              reportTypeLabel,
              actorName: user?.name || user?.email || user?.id || '',
            }),
          )
          .filter(Boolean)
        setActiveDraftRows(rows)
        return
      }
      const draft = await loadReportDraft(user.id, activeFormSlug)
      if (cancelled) return
      const row = buildDraftRow({
        draft: draft ? { payload: draft, savedAt: draft.savedAt || '', draftId: '' } : null,
        reportTypeSlug: activeFormSlug,
        reportTypeLabel,
        actorName: user?.name || user?.email || user?.id || '',
      })
      setActiveDraftRows(row ? [row] : [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [activeFormSlug, draftVersion, reportTypeLabel, user?.email, user?.id, user?.name])

  return { activeDraftRows, setActiveDraftRows }
}

export default useActiveReportDraftRows
