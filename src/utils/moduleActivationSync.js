const CHANNEL_NAME = 'vmecc_module_activation'
const EVENT_NAME = 'vmecc:module-activation-updated'

let channel = null
let revision = 0

const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME)
  }
  return channel
}

export const publishModuleActivation = (moduleActivation) => {
  if (!moduleActivation || typeof window === 'undefined') return
  revision += 1
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: moduleActivation }))
  getChannel()?.postMessage(moduleActivation)
}

export const getModuleActivationRevision = () => revision

export const subscribeToModuleActivation = (listener) => {
  if (typeof window === 'undefined') return () => {}
  const handleWindowEvent = (event) => listener(event.detail)
  const activeChannel = getChannel()
  const handleChannelMessage = (event) => {
    revision += 1
    listener(event.data)
  }

  window.addEventListener(EVENT_NAME, handleWindowEvent)
  if (activeChannel) activeChannel.addEventListener('message', handleChannelMessage)

  return () => {
    window.removeEventListener(EVENT_NAME, handleWindowEvent)
    if (activeChannel) activeChannel.removeEventListener('message', handleChannelMessage)
  }
}
