export const activateOnEnterOrSpace = (event, onActivate) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onActivate?.(event)
}
