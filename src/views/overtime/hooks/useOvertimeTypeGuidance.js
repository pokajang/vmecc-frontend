import { useEffect, useRef } from 'react'
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
  const requestSequenceRef = useRef(0)

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current
    const shouldClassify =
      activeSection === 'new-overtime' &&
      Boolean(claimDate) &&
      (isOvertimeGuidanceEnabled || overtimeTypeDerivedMode)

    if (!shouldClassify) {
      setIsOvertimeTypeDeriving(false)
      setOvertimeGuidanceMessage('')
      return undefined
    }

    const run = async () => {
      setIsOvertimeTypeDeriving(true)
      try {
        const result = await classifyMyOvertimeDateApiFirst(claimDate)
        if (requestSequenceRef.current !== requestSequence) return
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
      } catch {
        if (requestSequenceRef.current === requestSequence) {
          setOvertimeGuidanceMessage('')
        }
      } finally {
        if (requestSequenceRef.current === requestSequence) {
          setIsOvertimeTypeDeriving(false)
        }
      }
    }
    run()

    return () => {
      if (requestSequenceRef.current === requestSequence) {
        requestSequenceRef.current += 1
      }
    }
  }, [
    activeSection,
    claimDate,
    defaultOvertimeType,
    isOvertimeGuidanceEnabled,
    overtimeType,
    overtimeTypeDerivedMode,
    setIsOvertimeTypeDeriving,
    setOvertimeGuidanceMessage,
  ])
}

export default useOvertimeTypeGuidance
