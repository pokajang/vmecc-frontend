import { useEffect, useMemo, useState } from 'react'
import { loadInspectionDraft } from 'src/views/inspection/inspectionStorage'
import { buildDraftRow } from 'src/views/inspection/inspectionWorkspace'

const useInspectionDraftRows = (user) => {
  const [draftVersion, setDraftVersion] = useState(0)
  const [activeDraftRows, setActiveDraftRows] = useState([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) {
        if (!cancelled) setActiveDraftRows([])
        return
      }
      const draft = await loadInspectionDraft(user.id)
      if (cancelled) return
      const row = buildDraftRow(draft, user?.name || user?.email || user?.id || '')
      setActiveDraftRows(row ? [row] : [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [draftVersion, user?.email, user?.id, user?.name])

  const activeDraftPayload = useMemo(
    () => activeDraftRows[0]?.__rawDraftPayload || null,
    [activeDraftRows],
  )

  return {
    draftVersion,
    setDraftVersion,
    activeDraftRows,
    setActiveDraftRows,
    activeDraftPayload,
  }
}

export default useInspectionDraftRows
