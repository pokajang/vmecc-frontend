// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  buildScannerDiagnostics,
  classifyScannerFailure,
  getScannerFailureContent,
  SCANNER_FAILURE_TYPES,
  selectPreferredVideoDevice,
} from '../types/fire-extinguisher/scannerSupport'

describe('fireExtinguisher scanner support', () => {
  it('classifies secure-context and policy failures before camera access starts', () => {
    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: false,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'prompt',
          policyAllowsCamera: true,
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.INSECURE_CONTEXT)

    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'prompt',
          policyAllowsCamera: false,
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.POLICY_BLOCKED)
  })

  it('distinguishes persisted permission blocks from session denials', () => {
    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'denied',
          policyAllowsCamera: true,
        },
        error: {
          name: 'NotAllowedError',
          message: 'Permission denied',
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED)

    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'prompt',
          policyAllowsCamera: true,
        },
        error: {
          name: 'NotAllowedError',
          message: 'Permission denied',
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.PERMISSION_DENIED_SESSION)
  })

  it('classifies missing, overconstrained, and busy cameras separately', () => {
    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'granted',
          policyAllowsCamera: true,
        },
        error: {
          name: 'NotFoundError',
          message: 'No camera found',
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.NO_CAMERA_FOUND)

    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'granted',
          policyAllowsCamera: true,
        },
        error: {
          name: 'OverconstrainedError',
          message: 'Requested camera size is unavailable',
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.CAMERA_OVERCONSTRAINED)

    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'granted',
          policyAllowsCamera: true,
        },
        error: {
          name: 'NotReadableError',
          message: 'Camera busy',
        },
      }),
    ).toBe(SCANNER_FAILURE_TYPES.CAMERA_BUSY_OR_UNREADABLE)
  })

  it('does not report generic startup errors as unsupported when media APIs exist', () => {
    expect(
      classifyScannerFailure({
        environment: {
          isSecureContext: true,
          isTopLevelContext: true,
          supportsMediaDevices: true,
          permissionState: 'prompt',
          policyAllowsCamera: true,
        },
        error: {
          name: 'TypeError',
          message: 'Browser returned a generic startup failure.',
        },
        phase: 'requesting',
      }),
    ).toBe(SCANNER_FAILURE_TYPES.STARTUP_FAILED)
  })

  it('prefers rear-facing cameras when labels are available', () => {
    expect(
      selectPreferredVideoDevice([
        { kind: 'videoinput', deviceId: 'front-1', label: 'Front Camera' },
        { kind: 'videoinput', deviceId: 'rear-1', label: 'Back Camera' },
      ]),
    ).toEqual({
      kind: 'videoinput',
      deviceId: 'rear-1',
      label: 'Back Camera',
    })
  })

  it('builds diagnostics for support logs and exposes actionable copy', () => {
    const diagnostics = buildScannerDiagnostics({
      environment: {
        isSecureContext: true,
        isTopLevelContext: false,
        supportsMediaDevices: true,
        permissionState: 'denied',
        policyAllowsCamera: true,
        displayMode: 'browser',
        serviceWorkerSupported: true,
        serviceWorkerControlled: true,
        serviceWorkerCacheVersion: 'vmecc-app-shell-v5',
        userAgent: 'UnitTest Browser',
      },
      error: {
        name: 'NotAllowedError',
        message: 'Permission denied',
      },
      failureType: SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED,
      selectedDevice: {
        deviceId: 'rear-1',
        label: 'Back Camera',
      },
      phase: 'requesting',
    })

    expect(diagnostics).toEqual(
      expect.objectContaining({
        failureType: SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED,
        permissionState: 'denied',
        topLevelContext: false,
        displayMode: 'browser',
        serviceWorkerControlled: true,
        serviceWorkerCacheVersion: 'vmecc-app-shell-v5',
        selectedDeviceId: 'rear-1',
        selectedDeviceLabel: 'Back Camera',
      }),
    )

    expect(getScannerFailureContent(SCANNER_FAILURE_TYPES.PERMISSION_BLOCKED_PERSISTED)).toEqual(
      expect.objectContaining({
        title: 'Camera access is blocked',
        canRetry: true,
      }),
    )
  })
})
