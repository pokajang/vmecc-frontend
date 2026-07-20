export const shouldQueueInspectionReview = ({ isOnline = true, queuedCount = 0 } = {}) =>
  isOnline === false || Number(queuedCount || 0) > 0
