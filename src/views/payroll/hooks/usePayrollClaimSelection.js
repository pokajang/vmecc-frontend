/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { CLAIM_TYPE_ROUTES } from '../payrollConstants'

const usePayrollClaimSelection = ({ activeSection, navigate }) => {
  const [selectedClaimType, setSelectedClaimType] = useState('')
  const [claimPeriod, setClaimPeriod] = useState('')
  const [claimPeriodConfirmed, setClaimPeriodConfirmed] = useState(false)
  const [claimDraftPayload, setClaimDraftPayload] = useState(null)
  const [preserveClaimSelection, setPreserveClaimSelection] = useState(false)
  const [claimTypeLockedForSelection, setClaimTypeLockedForSelection] = useState(false)
  const [isDraftSelectionMode, setIsDraftSelectionMode] = useState(false)
  const [selectionReturnSnapshot, setSelectionReturnSnapshot] = useState(null)
  const previousSectionRef = useRef(activeSection)

  useEffect(() => {
    const isEnteringClaimSelection =
      activeSection === 'new-claim-select' && previousSectionRef.current !== 'new-claim-select'

    if (isEnteringClaimSelection) {
      if (preserveClaimSelection) {
        setPreserveClaimSelection(false)
      } else {
        setSelectedClaimType('')
        setClaimPeriod('')
        setClaimPeriodConfirmed(false)
        setClaimDraftPayload(null)
        setClaimTypeLockedForSelection(false)
        setIsDraftSelectionMode(false)
        setSelectionReturnSnapshot(null)
      }
    }

    previousSectionRef.current = activeSection
  }, [activeSection, preserveClaimSelection])

  useEffect(() => {
    if (activeSection === 'new-claim-expense' && !selectedClaimType) {
      setSelectedClaimType('expense')
    }
    if (activeSection === 'new-claim-salary' && !selectedClaimType) {
      setSelectedClaimType('salary')
    }
  }, [activeSection, selectedClaimType])

  const continueNewClaim = (claimType) => {
    const nextClaimType = claimTypeLockedForSelection ? selectedClaimType || 'expense' : claimType
    setSelectedClaimType(nextClaimType)
    setClaimPeriodConfirmed(true)
    setIsDraftSelectionMode(false)
    setSelectionReturnSnapshot(null)
    navigate(CLAIM_TYPE_ROUTES[nextClaimType] || CLAIM_TYPE_ROUTES.expense)
  }

  const navigateClaimType = (claimType) => {
    setSelectedClaimType(claimType)
    navigate(CLAIM_TYPE_ROUTES[claimType] || CLAIM_TYPE_ROUTES.expense)
  }

  const editClaimType = ({ draftPayload, claimType, lockClaimType = false } = {}) => {
    const effectiveType = claimType || selectedClaimType || draftPayload?.type || 'expense'
    if (draftPayload === null) {
      setClaimDraftPayload(null)
    } else if (draftPayload) {
      setClaimDraftPayload({
        ...draftPayload,
        type: effectiveType,
      })
    }
    if (draftPayload) {
      setIsDraftSelectionMode(true)
      setSelectionReturnSnapshot({
        claimType: effectiveType,
        claimPeriod,
        claimPeriodConfirmed,
      })
    } else {
      setIsDraftSelectionMode(false)
      setSelectionReturnSnapshot(null)
    }
    setClaimTypeLockedForSelection(Boolean(lockClaimType))
    setPreserveClaimSelection(true)
    navigate('/payroll/claims/new')
  }

  const cancelClaimSelectionEdit = () => {
    if (!isDraftSelectionMode || !selectionReturnSnapshot) return
    const returnType = selectionReturnSnapshot.claimType || 'expense'
    setSelectedClaimType(returnType)
    setClaimPeriod(selectionReturnSnapshot.claimPeriod || '')
    setClaimPeriodConfirmed(Boolean(selectionReturnSnapshot.claimPeriodConfirmed))
    setIsDraftSelectionMode(false)
    setSelectionReturnSnapshot(null)
    navigate(CLAIM_TYPE_ROUTES[returnType] || CLAIM_TYPE_ROUTES.expense)
  }

  return {
    selectedClaimType,
    setSelectedClaimType,
    claimPeriod,
    setClaimPeriod,
    claimPeriodConfirmed,
    setClaimPeriodConfirmed,
    claimDraftPayload,
    setClaimDraftPayload,
    claimTypeLockedForSelection,
    isDraftSelectionMode,
    continueNewClaim,
    navigateClaimType,
    editClaimType,
    cancelClaimSelectionEdit,
  }
}

export default usePayrollClaimSelection
