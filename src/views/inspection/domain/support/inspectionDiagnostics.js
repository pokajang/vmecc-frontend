import { loadInspectionQueue } from '../offline/inspectionOfflineQueue'
import {
  listFireExtinguisherOperationSessionUids,
  loadFireExtinguisherOperations,
} from '../../form/hooks/fireExtinguisherOperationStore'

const text = (value, maxLength = 200) =>
  String(value || '')
    .trim()
    .slice(0, maxLength)

const stableHash = (value) => {
  const source = String(value || '')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const operationMetadata = (operation = {}) => ({
  operationId: text(operation.operationId || operation.id, 190),
  sessionUid: text(operation.sessionUid, 190),
  assetKeyHash: stableHash(operation.assetKey || operation.canonicalAssetKey),
  type: text(operation.type || operation.operationType, 40),
  status: text(operation.status || operation.state, 40),
  attempts: Math.max(0, Number(operation.attempts || 0) || 0),
  createdAt: text(operation.createdAt, 40),
  updatedAt: text(operation.updatedAt, 40),
  retryAt: text(operation.retryAt || operation.nextRetryAt, 40),
  errorCode: text(operation.errorCode || operation.lastErrorCode, 100),
  error: text(operation.lastError || operation.error, 200),
})

const queueMetadata = (item = {}) => ({
  queueId: text(item.queueId || item.id, 190),
  submissionKeyHash: stableHash(item.submissionKey),
  status: text(item.status, 40),
  attempts: Math.max(0, Number(item.attempts || 0) || 0),
  createdAt: text(item.createdAt, 40),
  updatedAt: text(item.updatedAt, 40),
  retryAt: text(item.retryAt, 40),
  errorCode: text(item.errorCode || item.lastErrorCode, 100),
  error: text(item.lastError || item.error, 200),
})

export const buildInspectionSupportDiagnostics = (userId) => {
  const scopedUserId = text(userId, 190)
  if (!scopedUserId) return null

  const operations = listFireExtinguisherOperationSessionUids(scopedUserId).flatMap((sessionUid) =>
    loadFireExtinguisherOperations({ userId: scopedUserId, sessionUid }).map(operationMetadata),
  )
  const queue = loadInspectionQueue(scopedUserId).map(queueMetadata)
  const createdTimes = [...operations, ...queue]
    .map((row) => Date.parse(row.createdAt))
    .filter(Number.isFinite)

  return {
    generatedAt: new Date().toISOString(),
    userScopeHash: stableHash(scopedUserId),
    operationCount: operations.length,
    submissionQueueCount: queue.length,
    oldestPendingAgeMs:
      createdTimes.length > 0 ? Math.max(0, Date.now() - Math.min(...createdTimes)) : 0,
    operations,
    submissionQueue: queue,
  }
}

export const serializeInspectionSupportDiagnostics = (userId) => {
  const diagnostics = buildInspectionSupportDiagnostics(userId)
  return diagnostics ? JSON.stringify(diagnostics, null, 2) : ''
}
