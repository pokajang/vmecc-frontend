import React, { useEffect, useState } from 'react'
import { CAlert } from '@coreui/react'
import { useSelector } from 'react-redux'
import { isGracePhase } from 'src/utils/systemMaintenance'

const toRemainingMs = (graceEndsAt) => {
  const ts = Date.parse(String(graceEndsAt || ''))
  if (!Number.isFinite(ts)) return 0
  return Math.max(0, ts - Date.now())
}

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const MaintenanceGraceBanner = () => {
  const maintenance = useSelector((state) => state.systemMaintenance || {})
  const isGrace = isGracePhase(maintenance)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isGrace) return undefined
    const timer = window.setInterval(() => setTick((v) => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isGrace])

  const remainingMs = toRemainingMs(maintenance?.graceEndsAt)
  if (!isGrace) return null

  return (
    <CAlert color="warning" className="rounded-0 mb-0 border-start-0 border-end-0">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span className="small fw-semibold">
          The system is going for maintenance mode. Please save your work before lock.
        </span>
        <span className="small fw-bold">Starts in {formatCountdown(remainingMs)}</span>
      </div>
    </CAlert>
  )
}

export default MaintenanceGraceBanner
