const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost'])

const parseLoopbackUrl = (value, label = 'URL') => {
  let url

  try {
    url = new URL(String(value || '').trim())
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`)
  }

  if (
    url.protocol !== 'http:' ||
    !LOOPBACK_HOSTNAMES.has(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${label} must use an explicit http://localhost-or-127.0.0.1:<port> URL without credentials, query, or fragment.`,
    )
  }

  return url
}

const normalizeLoopbackOrigin = (value, label) => parseLoopbackUrl(value, label).origin

const getLoopbackUrlAliases = (value, label) => {
  const url = parseLoopbackUrl(value, label)
  const aliases = new Set([url.toString().replace(/\/$/, '')])
  const alias = new URL(url)
  alias.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
  aliases.add(alias.toString().replace(/\/$/, ''))
  return [...aliases]
}

module.exports = {
  getLoopbackUrlAliases,
  normalizeLoopbackOrigin,
  parseLoopbackUrl,
}
