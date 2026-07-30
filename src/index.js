import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'
import { registerAppServiceWorker } from './services/serviceWorkerRegistration'
import { purgeLegacyPayrollBrowserData } from './services/payrollPrivacy'

purgeLegacyPayrollBrowserData()

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void registerAppServiceWorker()
  })
}

if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {})

    globalThis.caches
      ?.keys?.()
      ?.then((keys) =>
        Promise.all(
          keys
            .filter((key) => String(key || '').startsWith('vmecc-app-shell-'))
            .map((key) => globalThis.caches.delete(key)),
        ),
      )
      .catch(() => {})
  })
}
