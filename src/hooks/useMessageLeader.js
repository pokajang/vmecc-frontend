/**
 * useMessageLeader
 *
 * Elects one browser tab as the "leader" responsible for polling.
 * Other tabs are followers — they receive state via BroadcastChannel
 * and fire no requests themselves.
 *
 * Leadership is claimed via localStorage with a heartbeat. If the
 * leader tab closes or goes silent, another tab claims leadership
 * within one heartbeat interval.
 */

const CHANNEL_NAME = 'vmecc_messages'
const HEARTBEAT_INTERVAL = 4000  // leader announces itself every 4s
const LEADER_TIMEOUT = 10000     // follower waits 10s before claiming leadership

const STORAGE_KEY = 'vmecc_msg_leader_ts'

let channel = null
let isLeader = false
let heartbeatTimer = null
let leaderCheckTimer = null
let onThreadsUpdate = null
let leaderListeners = new Set()

const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event) => {
      const { type, data } = event.data || {}
      if (type === 'heartbeat') {
        // Another tab is leader — record its timestamp and stay as follower
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
        demoteToFollower()
      }
      if (type === 'threads' && !isLeader && onThreadsUpdate) {
        onThreadsUpdate(data)
      }
    }
  }
  return channel
}

const startHeartbeat = () => {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
    getChannel()?.postMessage({ type: 'heartbeat' })
  }, HEARTBEAT_INTERVAL)
}

const stopHeartbeat = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

const promoteToLeader = () => {
  if (isLeader) return
  isLeader = true
  stopLeaderCheck()
  startHeartbeat()
  leaderListeners.forEach((fn) => fn(true))
}

const demoteToFollower = () => {
  if (!isLeader) {
    // Already follower — reset the check timer so we don't steal leadership
    scheduleLeaderCheck()
    return
  }
  isLeader = false
  stopHeartbeat()
  scheduleLeaderCheck()
  leaderListeners.forEach((fn) => fn(false))
}

const scheduleLeaderCheck = () => {
  stopLeaderCheck()
  leaderCheckTimer = setTimeout(() => {
    // No heartbeat heard in LEADER_TIMEOUT — claim leadership
    const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    if (Date.now() - last >= LEADER_TIMEOUT) {
      promoteToLeader()
    } else {
      scheduleLeaderCheck()
    }
  }, LEADER_TIMEOUT)
}

const stopLeaderCheck = () => {
  if (leaderCheckTimer) { clearTimeout(leaderCheckTimer); leaderCheckTimer = null }
}

export const initMessageLeader = (onLeaderChange, onThreadsReceived) => {
  leaderListeners.add(onLeaderChange)
  onThreadsUpdate = onThreadsReceived
  getChannel()

  // Attempt to claim leadership immediately if no recent heartbeat
  const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Date.now() - last >= LEADER_TIMEOUT) {
    promoteToLeader()
  } else {
    scheduleLeaderCheck()
  }

  return () => {
    leaderListeners.delete(onLeaderChange)
    if (leaderListeners.size === 0) {
      stopHeartbeat()
      stopLeaderCheck()
      isLeader = false
      onThreadsUpdate = null
    }
  }
}

export const broadcastThreads = (threads) => {
  if (!isLeader) return
  getChannel()?.postMessage({ type: 'threads', data: threads })
}

export const getIsLeader = () => isLeader
