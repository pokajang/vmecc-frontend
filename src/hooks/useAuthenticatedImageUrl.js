import { useEffect, useState } from 'react'
import { logError } from 'src/services/logger'

/**
 * Fetches an image through the authenticated API client (session cookie is
 * included automatically) and returns a local blob URL.
 *
 * This prevents the raw endpoint URL from being usable without an active
 * session — the browser's img src tag would also send the cookie, but this
 * approach means the URL itself is never a transferable secret.
 *
 * The blob URL is revoked when the component unmounts or the src changes.
 */
const useAuthenticatedImageUrl = (src, initialUrl = null) => {
  const [blobUrl, setBlobUrl] = useState(initialUrl || null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // If the caller already has a local blob URL (e.g. sender's optimistic preview),
    // skip the network fetch entirely — the image is already available.
    if (initialUrl) return
    if (!src) return
    let revoked = false
    let objectUrl = null

    fetch(src, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setError(false)
      })
      .catch((err) => {
        if (revoked) return
        setError(true)
        logError('[useAuthenticatedImageUrl] Failed to load attachment', err, { src })
      })

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setBlobUrl(null)
      setError(false)
    }
  }, [src, initialUrl])

  return { blobUrl, error }
}

export default useAuthenticatedImageUrl
