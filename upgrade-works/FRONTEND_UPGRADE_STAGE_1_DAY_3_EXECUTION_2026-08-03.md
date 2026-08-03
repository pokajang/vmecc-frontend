# VMECC Frontend Upgrade Stage 1 Day 3 Execution Record

**Recorded:** 2026-08-03  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Starting revision:** `b3e4783a2662616ee34f69f2dc90787d648d87f6`  
**Scope:** Production headers, CSP-compatible Google sign-in asset, and fail-closed production API configuration  
**Decision:** **LOCALLY VERIFIED — staging and production promotion remain blocked**

## 1. Outcome

The locally executable Day 3 work is complete. The frontend header sources are synchronized, camera permission is limited to the application origin, unrelated device capabilities remain disabled, the Google sign-in icon is bundled, and production builds cannot silently use the development localhost API fallback.

This checkpoint does not claim that a deployed Apache, reverse proxy, CDN, or application layer serves these headers. It also does not claim Android Chromium or iOS Safari camera qualification. Those acceptance criteria require an approved deployed origin and physical devices.

## 2. Changes Implemented

### 2.1 Security headers

- Synchronized the repository-root and `public/` `.htaccess` files.
- Set `Permissions-Policy` to `camera=(self), microphone=(), geolocation=(), payment=(), usb=()`.
- Preserved HSTS, frame denial, MIME-sniffing protection, strict-origin referrer policy, and the existing restrictive CSP directives.
- Removed `https://www.gstatic.com` from CSP `img-src` after removing the runtime dependency on that host.
- Did not introduce a wildcard source, `'unsafe-eval'`, broader camera origin, or newly enabled sensitive capability.

The locally established source roles are:

| File/layer | Local role | Verification state |
| --- | --- | --- |
| `public/.htaccess` | Canonical Vite public asset copied into generated builds | Verified byte-for-byte in the isolated build |
| Root `.htaccess` | Repository/deployment fallback copy | Synchronized and protected by the new audit |
| Apache/reverse proxy/CDN/application middleware | Actual deployed response-header layers | Unknown; requires operations/staging verification |

### 2.2 Google sign-in asset

- Added the existing Google sign-in mark under `src/assets/brand/google.svg`, retaining the source copyright notice.
- Replaced the login view's remote `www.gstatic.com` image reference with the bundled import.
- Preserved the decorative empty alternative text, `aria-hidden`, displayed dimensions, button label, click handler, loading state, and authentication flow.

### 2.3 Production API configuration

- Moved API-base resolution into a small environment module.
- Retained `http://localhost:8000/api` only when `import.meta.env.DEV` is true.
- Made missing API configuration throw outside development as a runtime defense.
- Added Vite build-time validation for production mode.
- Production `VITE_API_URL` must be:
  - present
  - an absolute HTTPS URL
  - free of embedded credentials
  - free of query strings and fragments
  - non-loopback, including localhost subdomains, trailing-dot localhost, the IPv4 `127/8` range, and IPv6 loopback
- Vite configuration validation loads only `VITE_`-prefixed variables.
- Documented in `.env.example`, `.env.production`, and the README that every `VITE_*` value is public browser configuration and must never contain secrets.

### 2.4 Automated production-configuration audit

Added `npm run audit:production-config`. It fails when:

- the root and public `.htaccess` sources differ
- a required security header is missing or changed
- camera is not same-origin-only or another restricted capability is enabled
- CSP loses required protections, introduces a wildcard or `'unsafe-eval'`, or retains the removed gstatic allowance
- the login view restores the remote icon dependency
- the checked-in production API URL is missing or unsafe
- CSP `connect-src` or `img-src` omits the configured production API origin

The audit reads configuration values only for validation and does not print them.

## 3. Focused Regression Evidence

Focused checks cover:

- development-only API fallback
- non-development missing configuration
- configured URL normalization
- valid production HTTPS configuration
- missing, malformed, HTTP, credential-bearing, query-bearing, and loopback production URLs
- localhost subdomain, trailing-dot, IPv4 `127/8`, and IPv6 loopback variants
- avoidance of false positives for normal domains containing the word `localhost`
- local Google icon rendering while preserving accessibility behavior
- existing login remember-me and HTTP-client CSRF behavior

```text
Test Files  3 passed (3)
Tests       24 passed (24)
```

A real Vite negative-build probe set `VITE_API_URL` to a blank value. The production build exited non-zero with the expected `VITE_API_URL is required` configuration error before producing a usable artifact.

## 4. Full Validation Evidence

All checks used Node.js 24.16.0.

| Check | Result |
| --- | --- |
| ESLint | Pass; 0 errors and 0 warnings |
| Production configuration audit | Pass |
| Focused tests | Pass; 3 files / 24 tests |
| Full Vitest suite | Pass; 315 files / 1,728 tests in 372.19s |
| Test-count comparison | Previous checkpoint: 314 files / 1,711 tests; current: +1 file / +17 tests; none removed |
| Hardcoded staff audit | Pass |
| Text contrast audit | Pass |
| Typography audit | Pass; 175 semantic and 61 direct declarations, 777 legacy small references tracked |
| Payroll hook-order contract | Pass |
| E2E module inventory contract | Pass; 50/50 mapped, 45 mapped and 5 partial, 0 qualified |
| Isolated production build | Pass; 6,491 modules transformed in 12.81s |
| Generated `.htaccess` | Byte-for-byte match with `public/.htaccess` |
| Generated asset scan | Production API present; localhost API and remote Google icon URL absent; bundled icon present |
| `git diff --check` | Pass |
| Package-lock mutation | None |
| Tracked `build/` mutation | None |

The build retains the pre-existing `WorkflowNotifications.js` static/dynamic import warning and chunks above 500 kB. The entry chunk is approximately 596.73 kB, the Inspection page approximately 1,024.95 kB, and CSS approximately 540.11 kB. The full test suite retains three non-failing JSDOM pseudo-element `getComputedStyle()` notices.

Both production-only and full dependency audits still report two high entries representing the existing React Router RSC-mode advisory. No forced breaking downgrade was applied.

## 5. Expected Header Diff and Rollback

Before Day 3, the two checked-in header sources disagreed:

| Source | Previous camera policy | Previous gstatic CSP allowance |
| --- | --- | --- |
| Root `.htaccess` | `camera=()` | Absent |
| `public/.htaccess` and generated build | `camera=(self)` | Present in `img-src` |

After Day 3 both sources use `camera=(self)` and omit gstatic. Therefore the expected generated-artifact header change is limited to removing gstatic from `img-src`; the root fallback additionally changes camera from denied to same-origin-only.

Rollback unit:

1. Revert the focused Day 3 commit to restore the previous source and runtime configuration.
2. Rebuild the complete artifact from the reverted revision; do not patch only `.htaccess` in a mixed artifact.
3. Verify API connectivity, Google sign-in button rendering, camera behavior, CSP, HSTS, framing, MIME, and referrer headers.
4. If a deployed-origin rollback is required, redeploy the previous complete approved artifact and verify service-worker/build-ID consistency.

The previous local build is not an approved production rollback artifact. Operations must identify the actual last-known-good deployed artifact before promotion.

## 6. Blocked Deployment Acceptance Criteria

The following Day 3 criteria remain open:

1. Capture actual staging response headers from every serving layer and confirm there are no duplicate or conflicting values.
2. Verify camera capture on an approved Android Chromium device.
3. Verify camera capture on an approved iOS Safari device.
4. Load the staged login page under enforced CSP and confirm no CSP console violation.
5. Verify API connectivity and authentication against the approved non-production backend.
6. Identify named operations, QA, security, and release decision owners.
7. Confirm the last-known-good artifact and complete a staging rollback drill.

Until these items are recorded, Day 3 is locally complete but not deployment-qualified, and Stage 1 remains open.

## 7. Next Safe Work

Proceed to the locally reviewable Day 4 CI quality-gate work as a separate change unit. Do not mark checks as required or claim branch-protection enforcement until the exact workflow runs successfully on the hosted repository and an owner confirms the repository settings.
