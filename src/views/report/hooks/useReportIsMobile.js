import React from 'react'

export const REPORT_MOBILE_BREAKPOINT = 767.98
export const REPORT_MOBILE_QUERY = `(max-width: ${REPORT_MOBILE_BREAKPOINT}px)`

const getIsMobile = () => {
  if (typeof window === 'undefined') return false
  const matchesQuery =
    typeof window.matchMedia === 'function' && window.matchMedia(REPORT_MOBILE_QUERY).matches
  return matchesQuery || Number(window.innerWidth || 0) <= REPORT_MOBILE_BREAKPOINT
}

export const useReportIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => getIsMobile())

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq =
      typeof window.matchMedia === 'function' ? window.matchMedia(REPORT_MOBILE_QUERY) : null
    const handler = () => setIsMobile(getIsMobile())
    handler()
    window.addEventListener('resize', handler)
    if (typeof mq?.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => {
        window.removeEventListener('resize', handler)
        mq.removeEventListener('change', handler)
      }
    }
    if (typeof mq?.addListener === 'function') {
      mq.addListener(handler)
      return () => {
        window.removeEventListener('resize', handler)
        mq.removeListener(handler)
      }
    }
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}

export default useReportIsMobile
