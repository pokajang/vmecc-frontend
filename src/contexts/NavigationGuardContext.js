import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'

const NavigationGuardContext = createContext(null)

const defaultMessage = 'You have unsaved changes. Leave this page and discard them?'

const isModifiedClick = (event) =>
  Boolean(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0)

const isSameDocumentTarget = (anchor) => {
  const target = String(anchor?.target || '')
    .trim()
    .toLowerCase()
  return !target || target === '_self'
}

export const NavigationGuardProvider = ({ children }) => {
  const [guards, setGuards] = useState({})
  const [pendingAction, setPendingAction] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const currentPathRef = useRef(`${location.pathname}${location.search}${location.hash}`)

  const activeGuards = useMemo(
    () => Object.values(guards).filter((guard) => guard && guard.active),
    [guards],
  )
  const isBlocked = activeGuards.length > 0
  const promptMessage = String(activeGuards[0]?.message || '').trim() || defaultMessage

  const registerGuard = useCallback((id, guardState) => {
    if (!id) return
    setGuards((prev) => ({
      ...prev,
      [id]: {
        active: Boolean(guardState?.active),
        message: String(guardState?.message || ''),
      },
    }))
  }, [])

  const unregisterGuard = useCallback((id) => {
    if (!id) return
    setGuards((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const requestNavigation = useCallback(
    (action) => {
      if (!isBlocked) {
        action?.()
        return true
      }
      setPendingAction(() => action || null)
      return false
    },
    [isBlocked],
  )

  const confirmDiscard = useCallback(() => {
    const action = pendingAction
    setPendingAction(null)
    action?.()
  }, [pendingAction])

  const stayOnPage = useCallback(() => {
    setPendingAction(null)
  }, [])

  useEffect(() => {
    currentPathRef.current = `${location.pathname}${location.search}${location.hash}`
  }, [location.hash, location.pathname, location.search])

  useEffect(() => {
    const onPopState = () => {
      if (!isBlocked) return
      const attemptedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      const currentPath = currentPathRef.current
      if (!attemptedPath || attemptedPath === currentPath) return
      window.history.pushState(window.history.state, '', currentPath)
      setPendingAction(() => () => navigate(attemptedPath))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isBlocked, navigate])

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isBlocked) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isBlocked])

  useEffect(() => {
    const onClickCapture = (event) => {
      if (!isBlocked) return
      if (event.defaultPrevented || isModifiedClick(event)) return
      const anchor = event.target?.closest?.('a[href]')
      if (!anchor) return
      if (!isSameDocumentTarget(anchor)) return
      if (anchor.hasAttribute('download')) return
      const href = String(anchor.getAttribute('href') || '').trim()
      if (!href || href.startsWith('#')) return
      let nextUrl
      try {
        nextUrl = new URL(href, window.location.href)
      } catch {
        return
      }
      if (nextUrl.origin !== window.location.origin) return
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
      const currentPath = `${location.pathname}${location.search}${location.hash}`
      if (nextPath === currentPath) return
      event.preventDefault()
      setPendingAction(() => () => navigate(nextPath))
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [isBlocked, location.hash, location.pathname, location.search, navigate])

  const value = useMemo(
    () => ({
      isBlocked,
      registerGuard,
      unregisterGuard,
      requestNavigation,
    }),
    [isBlocked, registerGuard, requestNavigation, unregisterGuard],
  )

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <CModal visible={Boolean(pendingAction)} alignment="center" onClose={stayOnPage}>
        <CModalHeader onClose={stayOnPage}>
          <CModalTitle>Discard unsaved changes?</CModalTitle>
        </CModalHeader>
        <CModalBody>{promptMessage}</CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={stayOnPage}>
            Stay
          </CButton>
          <CButton color="danger" onClick={confirmDiscard}>
            Discard and leave
          </CButton>
        </CModalFooter>
      </CModal>
    </NavigationGuardContext.Provider>
  )
}

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider')
  }
  return context
}

export const useGuardedNavigate = () => {
  const navigate = useNavigate()
  const { requestNavigation } = useNavigationGuard()
  return useCallback(
    (to, options) => requestNavigation(() => navigate(to, options)),
    [navigate, requestNavigation],
  )
}
