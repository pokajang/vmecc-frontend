import { useCallback, useEffect, useMemo, useState } from 'react'

const useMessagesResponsiveState = ({ activeUserId }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState('list')

  const showThreadPanel = !isMobile || mobileView === 'thread'
  const showListPanel = !isMobile || mobileView === 'list'
  const shouldPollThread = useMemo(
    () => Boolean(activeUserId && (!isMobile || mobileView === 'thread')),
    [activeUserId, isMobile, mobileView],
  )

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden)
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 991.98px)')
    const handleMedia = (event) => {
      setIsMobile(event.matches)
      setMobileView(event.matches ? 'list' : 'thread')
    }
    handleMedia(media)
    media.addEventListener('change', handleMedia)
    return () => media.removeEventListener('change', handleMedia)
  }, [])

  const handleBackToList = useCallback(() => {
    setMobileView('list')
  }, [])

  return {
    isVisible,
    isMobile,
    mobileView,
    setMobileView,
    showThreadPanel,
    showListPanel,
    shouldPollThread,
    handleBackToList,
  }
}

export default useMessagesResponsiveState
