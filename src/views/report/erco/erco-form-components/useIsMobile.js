import React from 'react'

const MOBILE_BREAKPOINT = 767.98
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`

const getIsMobile = () => {
  if (typeof window === 'undefined') return false
  const matchesQuery =
    typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
  return matchesQuery || Number(window.innerWidth || 0) <= MOBILE_BREAKPOINT
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => getIsMobile())
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null
    const handler = () => setIsMobile(getIsMobile())
    handler()
    window.addEventListener('resize', handler)
    if (typeof mq.addEventListener === 'function') {
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
export default useIsMobile
