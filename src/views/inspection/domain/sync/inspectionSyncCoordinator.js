import {
  getInspectionQueueNextRetryAt,
  loadInspectionQueue,
  syncInspectionQueue,
} from '../offline/inspectionOfflineQueue'
import {
  listFireExtinguisherOperationSessionUids,
  loadFireExtinguisherOperations,
} from '../../form/hooks/fireExtinguisherOperationStore'
import { retryFireExtinguisherSessionQueue } from '../../form/hooks/fireExtinguisherSessionRetryQueue'
import { notifyInspectionSyncStateChanged } from './inspectionSyncEvents'

const LEASE_PREFIX = 'inspection_sync_worker_v1_'
const LEASE_DURATION_MS = 45 * 1000
const HEARTBEAT_MS = 15 * 1000
const inFlightByUser = new Map()

const text = (value) => String(value || '').trim()

const createWorkerId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  if (!globalThis.crypto?.getRandomValues) return `memory-${Date.now()}`
  const bytes = new Uint32Array(4)
  globalThis.crypto.getRandomValues(bytes)
  return [...bytes].map((value) => value.toString(16)).join('-')
}

const WORKER_ID = createWorkerId()
const leaseKey = (userId) => `${LEASE_PREFIX}${text(userId) || 'unknown'}`

const readLease = (userId) => {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(leaseKey(userId)) || 'null')
  } catch {
    return null
  }
}

const writeLease = (userId) => {
  const lease = {
    owner: WORKER_ID,
    expiresAt: Date.now() + LEASE_DURATION_MS,
  }
  try {
    globalThis.localStorage?.setItem(leaseKey(userId), JSON.stringify(lease))
    const confirmed = readLease(userId)
    return confirmed?.owner === WORKER_ID ? lease : null
  } catch {
    // The in-memory lock still prevents duplicate workers in this tab.
    return { ...lease, memoryOnly: true }
  }
}

const acquireLease = async (userId) => {
  const current = readLease(userId)
  if (
    current?.owner &&
    current.owner !== WORKER_ID &&
    Number(current.expiresAt || 0) > Date.now()
  ) {
    return null
  }
  const claimed = writeLease(userId)
  if (!claimed || claimed.memoryOnly) return claimed
  await new Promise((resolve) => globalThis.setTimeout?.(resolve, 35))
  return readLease(userId)?.owner === WORKER_ID ? claimed : null
}

const releaseLease = (userId, lease) => {
  if (lease?.memoryOnly) return
  try {
    if (readLease(userId)?.owner === WORKER_ID) {
      globalThis.localStorage?.removeItem(leaseKey(userId))
    }
  } catch {
    // Expiry allows another tab to recover the worker lease.
  }
}

export const runInspectionSyncCoordinator = ({ userId = '', force = false, queueId = '' } = {}) => {
  const normalizedUserId = text(userId)
  if (!normalizedUserId) return Promise.resolve({ generalResults: [], feResults: [] })
  if (inFlightByUser.has(normalizedUserId)) return inFlightByUser.get(normalizedUserId)

  const run = (async () => {
    const lease = await acquireLease(normalizedUserId)
    if (!lease) return { generalResults: [], feResults: [], skipped: 'worker-active' }
    const heartbeat = globalThis.setInterval?.(() => writeLease(normalizedUserId), HEARTBEAT_MS)
    try {
      const generalResults = await syncInspectionQueue({
        userId: normalizedUserId,
        force,
        queueId,
      })
      const feResults = await retryFireExtinguisherSessionQueue({
        userId: normalizedUserId,
        force,
      })
      return { generalResults, feResults }
    } finally {
      if (heartbeat) globalThis.clearInterval?.(heartbeat)
      releaseLease(normalizedUserId, lease)
      notifyInspectionSyncStateChanged({ userId: normalizedUserId, source: 'cycle-complete' })
    }
  })()
  inFlightByUser.set(normalizedUserId, run)
  const cleanup = () => {
    if (inFlightByUser.get(normalizedUserId) === run) inFlightByUser.delete(normalizedUserId)
  }
  void run.then(cleanup, cleanup)
  return run
}

export const getNextInspectionSyncAt = (userId = '') => {
  const timestamps = []
  loadInspectionQueue(userId).forEach((item) => {
    if (item.status === 'conflict' || item.status === 'blocked' || item.status === 'syncing') return
    const retryAt = getInspectionQueueNextRetryAt(item)
    timestamps.push(retryAt ? new Date(retryAt).getTime() : Date.now())
  })
  listFireExtinguisherOperationSessionUids(userId).forEach((sessionUid) => {
    loadFireExtinguisherOperations({ userId, sessionUid }).forEach((operation) => {
      if (operation.state === 'conflict') return
      timestamps.push(
        operation.nextRetryAt ? new Date(operation.nextRetryAt).getTime() : Date.now(),
      )
    })
  })
  const valid = timestamps.filter(Number.isFinite)
  if (valid.length === 0) return null
  const earliest = Math.min(...valid)
  const activeLease = readLease(userId)
  return activeLease?.owner &&
    activeLease.owner !== WORKER_ID &&
    Number(activeLease.expiresAt || 0) > Date.now()
    ? Math.max(earliest, Number(activeLease.expiresAt))
    : earliest
}
