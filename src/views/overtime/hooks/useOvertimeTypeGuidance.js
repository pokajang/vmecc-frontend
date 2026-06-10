import { useEffect } from 'react'
import { classifyMyOvertimeDateApiFirst } from 'src/services/overtimeApi'
import { getOvertimeTypeLabel, normalizeOvertimeType } from '../utils'

const useOvertimeTypeGuidance = ({
  activeSection,
  claimDate,
  defaultOvertimeType,
  isOvertimeGuidanceEnabled,
  overtimeType,
  overtimeTypeDerivedMode,
  setIsOvertimeTypeDeriving,
  setOvertimeGuidanceMessage,
}) => {
  useEffect(() => {
    if (activeSection !== 'new-overtime') return
    if (!claimDate) {
      setOvertimeGuidanceMessage('')
      return
    }
    let active = true
    const run = async () => {
      if (!isOvertimeGuidanceEnabled || !claimDate) {
        if (active) setOvertimeGuidanceMessage('')
        return
      }
      setIsOvertimeTypeDeriving(true)
      const result = await classifyMyOvertimeDateApiFirst(claimDate)
      if (!active) return
      setIsOvertimeTypeDeriving(false)
      if (!result?.ok) {
        setOvertimeGuidanceMessage('')
        return
      }
      const recommendedType = normalizeOvertimeType(
        result?.data?.overtime_type || defaultOvertimeType,
      )
      const selectedType = normalizeOvertimeType(overtimeType || defaultOvertimeType)
      const nextMessage =
        selectedType !== recommendedType
          ? `Recommended overtime type for ${claimDate} is ${getOvertimeTypeLabel(recommendedType, { short: true })}.`
          : `Selected overtime type matches recommendation for ${claimDate}.`
      setOvertimeGuidanceMessage(nextMessage)
    }
    run()
    return () => {
      active = false
    }
  }, [
    activeSection,
    claimDate,
    defaultOvertimeType,
    isOvertimeGuidanceEnabled,
    overtimeType,
    setIsOvertimeTypeDeriving,
    setOvertimeGuidanceMessage,
  ])

  useEffect(() => {
    if (!overtimeTypeDerivedMode) return
    if (!claimDate) return
    let active = true
    const run = async () => {
      setIsOvertimeTypeDeriving(true)
      const result = await classifyMyOvertimeDateApiFirst(claimDate)
      if (!active) return
      setIsOvertimeTypeDeriving(false)
      if (!result?.ok) {
        setOvertimeGuidanceMessage('')
        return
      }
      const recommendedType = normalizeOvertimeType(
        result?.data?.overtime_type || defaultOvertimeType,
      )
      const selectedType = normalizeOvertimeType(overtimeType || defaultOvertimeType)
      const nextMessage =
        selectedType !== recommendedType
          ? `Recommended overtime type for ${claimDate} is ${getOvertimeTypeLabel(recommendedType, { short: true })}.`
          : `Selected overtime type matches recommendation for ${claimDate}.`
      setOvertimeGuidanceMessage(nextMessage)
    }
    run()
    return () => {
      active = false
    }
  }, [
    claimDate,
    defaultOvertimeType,
    overtimeType,
    overtimeTypeDerivedMode,
    setIsOvertimeTypeDeriving,
    setOvertimeGuidanceMessage,
  ])
}

export default useOvertimeTypeGuidance
