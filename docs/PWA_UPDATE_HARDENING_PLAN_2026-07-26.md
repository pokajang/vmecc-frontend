# PWA update hardening plan

Date: 2026-07-26  
Scope: `vmecc-frontend`

## Outcome

Installed VMECC clients must receive each deployed frontend without being uninstalled. A client
may reload automatically only when it is safe to do so. Dirty forms and in-progress operations
must instead receive a persistent update prompt protected by the existing navigation guard.

This work does not change the PWA installation flow or the `PWA_INSTALL_ACTION` constant.

## Current gaps

1. `public/.htaccess` gives every JavaScript file a one-year immutable cache lifetime. This
   includes the stable `/service-worker.js` URL.
2. The service worker uses the manually maintained cache name `vmecc-app-shell-v8`, so an
   ordinary frontend build does not necessarily produce a different worker or cache.
3. The worker calls `skipWaiting()` during installation. A new worker can take control while an
   existing page is still running old JavaScript.
4. `clients.claim()` does not reload an existing page. The old JavaScript remains in memory until
   a navigation or explicit reload.
5. The app detects `version.json` changes but the Refresh action only calls
   `window.location.reload()`. It does not coordinate worker installation and activation.
6. “Later” suppresses the update for the rest of the browser session, which can be very long for
   a suspended mobile PWA.
7. The update banner is mounted only in the authenticated layout.
8. The inspection module has its own `beforeunload` listener instead of registering its dirty
   state with `NavigationGuardContext`. The update UI therefore cannot reliably determine
   whether an inspection is safe to reload.
9. Worker activation deletes every Cache Storage entry on the origin except its current cache.
   Cleanup should only affect VMECC app-shell caches.

## Target lifecycle

1. A deployment emits `version.json` and `service-worker.js` with the same unique build ID.
2. HTML, `version.json`, and `service-worker.js` are always revalidated. Content-hashed assets
   remain immutable for one year.
3. Registration checks for a new worker at startup and whenever the application returns to the
   foreground.
4. A new worker installs its build-specific offline shell and waits.
5. The update coordinator decides:
   - safe and visible: activate the waiting worker and reload once;
   - dirty or busy: show a persistent “Update ready” banner;
   - hidden: defer the decision until the next visible event.
6. The manual Update action passes through `NavigationGuardContext`, activates the waiting
   worker, waits for `controllerchange`, and reloads exactly once.
7. If the worker update cannot be prepared, the user sees a retryable update state. The current
   application remains usable.

## Implementation work

### 1. Correct production cache headers

Files:

- `public/.htaccess`
- `.htaccess`, if the repository-root file is still part of a supported deployment path

Changes:

- Add explicit late overrides for `service-worker.js`:
  `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, and `Expires: 0`.
- Preserve the existing no-cache override for `version.json`.
- Explicitly give `index.html` the same revalidation policy.
- Keep `public, max-age=31536000, immutable` only for content-hashed build assets and versioned
  static images/fonts. Prefer an `/assets/` location rule over a broad extension rule.
- Give `manifest.json` a revalidation or short-lived policy because its query version is currently
  maintained manually.
- Ensure the generated `build/.htaccess` contains the same rules after `vite build`.

Deployment verification must inspect response headers for `/`, `/index.html`, `/version.json`,
`/service-worker.js`, and one hashed `/assets/` file. Apache rules alone are insufficient if a CDN
or hosting layer overwrites them.

### 2. Generate a build-specific service worker

Files:

- `vite.config.mjs`
- replace `public/service-worker.js` with a source template outside `public`, for example
  `src/service-worker/service-worker.template.js`
- update `src/services/__tests__/serviceWorkerRuntime.test.js`

Changes:

- Extend the existing build-metadata plugin to emit `/service-worker.js`.
- Inject the same `buildId` used by `/version.json`.
- Derive the cache name as `vmecc-app-shell-<build-id>` after sanitizing the ID.
- Keep the worker script itself deterministic for a given build ID.
- Remove unconditional `skipWaiting()` from the install handler.
- Add a `VMECC_SKIP_WAITING` message handled by the waiting worker.
- During activation, delete only caches beginning with `vmecc-app-shell-`; never delete unrelated
  origin caches.
- Keep navigation network-first with the cached shell as the offline fallback.
- Ensure shell refreshes use fresh network responses rather than accepting an HTTP-cache copy.
- Review the shell list while making this change. Cache a canonical HTML shell instead of
  duplicate route responses unless a route-specific entry is demonstrably required.

The build must fail if service-worker generation fails or if the build ID cannot be injected.

### 3. Add a service-worker update coordinator

Files:

- `src/services/serviceWorkerRegistration.js`
- add `src/services/serviceWorkerUpdates.js`
- `src/index.js`

Responsibilities:

- Register with:

  ```js
  navigator.serviceWorker.register('/service-worker.js', {
    updateViaCache: 'none',
  })
  ```

- Retain the registration in a small module-level coordinator rather than making UI components
  register independently.
- Expose focused operations:
  - `getRegistration()`
  - `checkForServiceWorkerUpdate()`
  - `prepareAppUpdate()`
  - `activateWaitingWorker()`
- Check on initial load, `visibilitychange` to visible, `pageshow`, and `online`. Coalesce
  simultaneous checks so only one `registration.update()` is in flight.
- `activateWaitingWorker()` must:
  1. locate or wait briefly for `registration.waiting`;
  2. attach a one-shot `controllerchange` listener;
  3. post `VMECC_SKIP_WAITING`;
  4. resolve when the controller changes or reject on a bounded timeout.
- Do not reload inside the service module. It should report state to the React update coordinator.
- Keep registration/update failures non-fatal and observable to the update UI.

### 4. Unify update detection and state

Files:

- `src/hooks/useAppUpdateAvailable.js`
- `src/services/appVersion.js`
- optionally add `src/contexts/AppUpdateContext.js`

Changes:

- Treat `version.json` as release discovery and the service worker as release readiness.
- Model explicit states rather than one boolean:
  - `current`
  - `discovered`
  - `preparing`
  - `ready`
  - `activating`
  - `failed`
- When a different build ID is discovered, immediately call `prepareAppUpdate()`.
- Mark the update `ready` only when the corresponding worker is waiting or when no worker
  replacement is required and a network reload is sufficient.
- Keep a failed check from clearing an already discovered or ready update.
- Replace session-long suppression with a bounded snooze, stored as a timestamp per build. The
  update must reappear after the timeout and on a later foreground event.
- Mount the update provider above the authenticated/public route split so login, maintenance,
  and authenticated pages share one update lifecycle.

Recommended initial snooze: 15 minutes. Critical releases can be made non-snoozable later, but
that policy is outside this change.

### 5. Define and expose reload safety

Files:

- `src/contexts/NavigationGuardContext.js`
- `src/views/inspection/state/useInspectionUnsavedChangesGuard.js`
- `src/views/inspection/app/InspectionModule.js`
- inspection photo/draft synchronization integration points as required

Changes:

- Continue using `NavigationGuardContext` as the source of truth for unsaved state.
- Convert the inspection-specific `beforeunload` hook to register/unregister an inspection guard
  with the shared context. Preserve browser `beforeunload` protection through the context.
- Register a guard for transient operations that cannot safely survive a reload, including active
  photo processing or an unsaved photo editor.
- Do not treat durable IndexedDB drafts or queued offline submissions as reload blockers merely
  because they are pending; they should survive reload. Add tests proving that persistence before
  allowing automatic updates.
- Expose `isBlocked` to the app update coordinator. Automatic activation/reload is allowed only
  when:
  - the document is visible;
  - no navigation guard is active;
  - no update/reload is already in progress.

Start conservatively: if safety cannot be determined, show the prompt instead of auto-reloading.

### 6. Harden update UI and reload behavior

Files:

- `src/components/AppUpdateBanner.js`
- `src/App.js` or the new app update provider
- relevant SCSS only if a new error/progress state needs styling

Changes:

- Replace “Refresh” with an action that prepares and activates the update before reloading.
- Use `requestNavigation()` for manual updates so dirty forms still receive the discard
  confirmation.
- Change the confirmation copy for this action to make the consequence explicit, for example:
  “Update VMECC and discard unsaved changes?”
- Display preparation/activation progress and disable duplicate actions.
- On preparation failure, retain the banner and offer Retry.
- Reload once after successful `controllerchange`. Add an in-memory one-shot latch to prevent
  controller events from creating a reload loop.
- If an update becomes ready while the page is safe and visible, automatically run the same
  activation path.
- If it becomes ready while blocked, keep the banner visible and retry the safety decision when
  guards clear or the document returns to the foreground.
- Keep “Later” available only while the update is not critical, and apply the bounded snooze.

### 7. Preserve offline behavior across releases

Files:

- `src/views/inspection/domain/offline/inspectionOfflineHealth.js`
- service-worker runtime tests

Changes:

- Ensure offline health recognizes build-specific `vmecc-app-shell-*` caches.
- Make “Refresh offline assets” update the registration, communicate with the active/current
  worker, and report which build cache was refreshed.
- Test update activation while a previous cache exists.
- Confirm that the new shell and its entry JS/CSS are available offline after a successful online
  update cycle.
- Avoid deleting the previous shell until the new cache is completely populated.

## Test plan

### Unit tests

Update or add focused Vitest coverage for:

- registration uses `updateViaCache: 'none'`;
- update checks are coalesced;
- waiting-worker activation posts `VMECC_SKIP_WAITING`;
- activation resolves on `controllerchange` and times out cleanly;
- no automatic reload occurs while a navigation guard is active;
- safe visible clients reload once;
- hidden clients defer until visible;
- manual update uses the navigation guard;
- update failures remain retryable;
- snoozed updates reappear after the configured duration;
- a failed version request does not clear an existing ready update;
- worker install does not call `skipWaiting()` automatically;
- worker message handling does call it for `VMECC_SKIP_WAITING`;
- cache cleanup touches only `vmecc-app-shell-*`;
- build-specific cache names differ between build IDs;
- inspection dirty/photo-processing states register shared guards;
- durable offline queues survive the reload path.

Primary existing suites:

- `src/services/__tests__/serviceWorkerRegistration.test.js`
- `src/services/__tests__/serviceWorkerRuntime.test.js`
- `src/services/__tests__/appVersion.test.js`
- `src/hooks/__tests__/useAppUpdateAvailable.test.jsx`
- `src/components/__tests__/AppUpdateBanner.test.jsx`
- `src/contexts/__tests__/NavigationGuardContext.test.jsx`
- focused inspection offline/guard tests

### Production-build integration test

Add a Playwright PWA update test using two separately built releases:

1. Serve build A and install/control a page with worker A.
2. Replace the served files with build B without clearing browser data.
3. Return the installed app to the foreground.
4. Verify build B is discovered and worker B reaches waiting/ready.
5. With a dirty form, verify no automatic reload and verify the guarded prompt.
6. Clear/save the form and verify one automatic activation/reload into build B.
7. Take the server offline and verify build B opens from its offline shell.
8. Verify unrelated Cache Storage entries remain intact.

This test is the release-level proof that uninstall/reinstall is no longer required.

### Header verification

Against the actual production origin, assert:

| Resource | Required policy |
| --- | --- |
| `/service-worker.js` | no-store/no-cache or equivalent mandatory revalidation |
| `/version.json` | no-store/no-cache |
| `/index.html` and SPA navigation | no-store/no-cache |
| `/assets/<content-hash>.js` | one-year immutable |
| `/assets/<content-hash>.css` | one-year immutable |

## Delivery sequence

1. Header corrections and build-specific worker generation.
2. Worker waiting/activation protocol and registration coordinator.
3. Shared update state and guarded UI.
4. Inspection guard integration and safe automatic reload.
5. Offline/update integration tests and production header validation.

Keep these as reviewable commits. Do not enable automatic reload until the shared inspection
guard and reload-once tests are in place.

## Acceptance criteria

- A mobile PWA on build A moves to build B without uninstalling or clearing site data.
- A safe, visible client updates automatically after build B is ready.
- A client with unsaved or transient work never reloads automatically.
- Manual update is protected by the existing discard confirmation.
- Each deployment generates a different worker/cache identity.
- `service-worker.js`, `version.json`, and HTML cannot be held immutable by the browser or CDN.
- Content-hashed assets retain long-lived immutable caching.
- Update activation causes at most one reload.
- Offline startup uses the new shell after update.
- Existing offline drafts and queued submissions remain available.
- Unrelated Cache Storage entries are not deleted.

## Rollout and observability

- Deploy first to a staging origin and test Chrome Android and iOS standalone mode with browser
  data preserved between builds.
- Record current build ID, discovered build ID, worker state, update failure reason, and reload
  reason in existing client diagnostics. Do not log form contents or other user data.
- Roll out production with guarded manual activation enabled first.
- Enable safe automatic activation after the staging and production canary update paths pass.
- Retain an emergency configuration switch that disables automatic reload while leaving update
  discovery and the manual Update action operational.
