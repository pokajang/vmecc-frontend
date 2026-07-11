import {
  completeInspectionSessionExtinguisher,
  getFireExtinguisherAssetKey,
  resetInspectionSessionExtinguisher,
} from '../../domain/api/inspectionSessionApi'
import { normalizeInspectionApiError } from '../../domain/api/inspectionApiError'
import {
  renewInspectionPayloadMediaLeases,
  shouldRenewInspectionMediaLeases,
} from '../../domain/media/inspectionMediaLease'
import {
  acknowledgeFireExtinguisherOperation,
  createFireExtinguisherOperationId,
  enqueueFireExtinguisherOperation,
  enqueueFireExtinguisherOperationDurably,
  getFireExtinguisherOperationRetryDelayMs,
  listFireExtinguisherOperationSessionUids,
  loadFireExtinguisherOperations,
  rebaseFollowingFireExtinguisherOperations,
  updateFireExtinguisherOperation,
} from './fireExtinguisherOperationStore'

const text = (value) => String(value || '').trim()
const renewOperationMediaLeases = async (operation) => {
  if (!shouldRenewInspectionMediaLeases(operation.leaseRenewedAt)) return
  const renewed = await renewInspectionPayloadMediaLeases(operation.row, operation.operationId)
  if (renewed > 0) operation.leaseRenewedAt = new Date().toISOString()
}

// Retained for compatibility with older callers. New saves use a unique operation ID.
export const getFireExtinguisherSessionClientResultId = (sessionUid, assetKey) =>
  `fe-session:${text(sessionUid).slice(-36)}:${text(assetKey).slice(0, 120)}`

export const createFireExtinguisherSessionOperationId = () => createFireExtinguisherOperationId()

export const isFireExtinguisherSessionRetryableError = (error) =>
  normalizeInspectionApiError(error).retryable

export const loadFireExtinguisherSessionRetryQueue = ({ userId = '', sessionUid = '' } = {}) =>
  loadFireExtinguisherOperations({ userId, sessionUid })

export const countFireExtinguisherSessionRetryQueue = ({ userId = '', sessionUid = '' } = {}) => {
  const normalizedSessionUid = text(sessionUid)
  if (normalizedSessionUid) {
    return loadFireExtinguisherOperations({ userId, sessionUid: normalizedSessionUid }).length
  }

  return listFireExtinguisherOperationSessionUids(userId).reduce(
    (count, targetSessionUid) =>
      count + loadFireExtinguisherOperations({ userId, sessionUid: targetSessionUid }).length,
    0,
  )
}

export const enqueueFireExtinguisherSessionRetry = ({
  userId = '',
  sessionUid = '',
  row,
  options = {},
  error = null,
} = {}) =>
  enqueueFireExtinguisherOperation({
    userId,
    sessionUid,
    operationId: options.operationId,
    type: options.operationType === 'reset' ? 'reset' : 'complete',
    row,
    baseVersion: options.baseVersion,
    forceRecheck: options.forceRecheck === true,
    state: options.state,
    error,
  })

export const persistFireExtinguisherSessionOperation = ({
  userId = '',
  sessionUid = '',
  row,
  options = {},
} = {}) =>
  enqueueFireExtinguisherOperationDurably({
    userId,
    sessionUid,
    operationId: options.operationId,
    type: options.operationType === 'reset' ? 'reset' : 'complete',
    row,
    baseVersion: options.baseVersion,
    forceRecheck: options.forceRecheck === true,
    state: options.state,
  })

export const removeFireExtinguisherSessionRetry = ({
  userId = '',
  sessionUid = '',
  operationId = '',
  assetKey = '',
} = {}) => {
  const normalizedOperationId = text(operationId)
  if (normalizedOperationId) {
    return acknowledgeFireExtinguisherOperation({
      userId,
      sessionUid,
      operationId: normalizedOperationId,
    })
  }

  // Compatibility path for legacy callers; remove only the oldest matching operation.
  const oldest = loadFireExtinguisherOperations({ userId, sessionUid })
    .filter((operation) => operation.assetKey === text(assetKey))
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))[0]
  return oldest
    ? acknowledgeFireExtinguisherOperation({ userId, sessionUid, operationId: oldest.operationId })
    : false
}

const syncOperation = async (operation) => {
  const request = {
    sessionUid: operation.sessionUid,
    row: operation.row,
    operationId: operation.operationId,
    baseVersion: operation.baseVersion,
  }
  return operation.type === 'reset'
    ? resetInspectionSessionExtinguisher(request)
    : completeInspectionSessionExtinguisher({
        ...request,
        clientResultId: operation.operationId,
        forceRecheck: operation.forceRecheck,
      })
}

export const retryFireExtinguisherSessionQueue = async ({
  userId = '',
  sessionUid = '',
  force = false,
} = {}) => {
  if (!text(userId)) return []
  const sessionUids = text(sessionUid)
    ? [text(sessionUid)]
    : listFireExtinguisherOperationSessionUids(userId)
  const results = []

  for (const targetSessionUid of sessionUids) {
    const blockedAssetKeys = new Set()
    const queue = loadFireExtinguisherOperations({ userId, sessionUid: targetSessionUid }).sort(
      (left, right) => String(left.createdAt).localeCompare(String(right.createdAt)),
    )
    for (const operation of queue) {
      if (blockedAssetKeys.has(operation.assetKey)) continue
      if (
        !force &&
        operation.nextRetryAt &&
        new Date(operation.nextRetryAt).getTime() > Date.now()
      ) {
        continue
      }
      if (operation.state === 'conflict') {
        blockedAssetKeys.add(operation.assetKey)
        results.push({
          assetKey: operation.assetKey,
          operationId: operation.operationId,
          sessionUid: targetSessionUid,
          synced: false,
          conflict: true,
        })
        continue
      }

      try {
        await renewOperationMediaLeases(operation)
        if (operation.leaseRenewedAt) {
          updateFireExtinguisherOperation({
            userId,
            sessionUid: targetSessionUid,
            operationId: operation.operationId,
            patch: { leaseRenewedAt: operation.leaseRenewedAt },
          })
        }
        const response = await syncOperation(operation)
        if (operation.type === 'complete' && !response?.row) {
          throw new Error('Fire extinguisher session sync returned no result.')
        }
        rebaseFollowingFireExtinguisherOperations({
          userId,
          sessionUid: targetSessionUid,
          operationId: operation.operationId,
          resultVersion: response?.row?.version,
        })
        acknowledgeFireExtinguisherOperation({
          userId,
          sessionUid: targetSessionUid,
          operationId: operation.operationId,
        })
        results.push({
          assetKey: operation.assetKey,
          operationId: operation.operationId,
          operationType: operation.type,
          sessionUid: targetSessionUid,
          synced: true,
          replayed: response?.operation?.replayed === true,
          row: response?.row || null,
        })
      } catch (error) {
        const normalized = normalizeInspectionApiError(error)
        const attempts = operation.attempts + 1
        updateFireExtinguisherOperation({
          userId,
          sessionUid: targetSessionUid,
          operationId: operation.operationId,
          patch: {
            state: normalized.retryable ? 'retryable' : 'conflict',
            attempts,
            nextRetryAt: normalized.retryable
              ? new Date(
                  Date.now() + getFireExtinguisherOperationRetryDelayMs(attempts),
                ).toISOString()
              : '',
            lastAttemptAt: new Date().toISOString(),
            lastError: normalized.message,
            lastErrorCode: normalized.code,
          },
        })
        results.push({
          assetKey: operation.assetKey,
          operationId: operation.operationId,
          operationType: operation.type,
          sessionUid: targetSessionUid,
          synced: false,
          conflict: normalized.conflict,
          error,
        })
        // Later operations for the same asset depend on this operation's resulting version.
        blockedAssetKeys.add(operation.assetKey)
      }
    }
  }

  return results
}

export { rebaseFollowingFireExtinguisherOperations }
