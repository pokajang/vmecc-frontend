const isRequestCancellation = (errorText) =>
  /cancel(?:led|ed)|ns_binding_aborted/i.test(String(errorText || ''))

const isExpectedMissingResourceConsoleError = (route, message) =>
  route.allowMissingResource &&
  /failed to load resource.*status of 404|404 \(not found\)/i.test(message)

const isNavigationCancellationPageError = (message, cancelledRequests) => {
  if (!/access control checks|networkerror|dynamically imported module/i.test(message)) {
    return false
  }

  return cancelledRequests.some(({ errorText, url }) => {
    if (!isRequestCancellation(errorText)) return false

    const requestUrl = new URL(url)
    return (
      message.includes(url) ||
      message.includes(`${requestUrl.hostname}:${requestUrl.port}${requestUrl.pathname}`) ||
      message.includes(requestUrl.pathname)
    )
  })
}

module.exports = {
  isExpectedMissingResourceConsoleError,
  isNavigationCancellationPageError,
  isRequestCancellation,
}
