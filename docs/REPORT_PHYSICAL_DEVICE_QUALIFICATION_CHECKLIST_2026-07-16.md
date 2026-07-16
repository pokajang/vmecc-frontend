# Report Physical-Device Qualification Checklist

Date prepared: 2026-07-16  
Scope: ERCO, Drill, and Fitness Test reports  
Status: Ready for physical execution; evidence is still required on real iOS and Android devices.

## Evidence header

Complete one row per device/browser/build combination.

| Field                           | Value                |
| ------------------------------- | -------------------- |
| Tester                          |                      |
| Test date/time and timezone     |                      |
| Build ID/version                |                      |
| Device model                    |                      |
| OS/version                      |                      |
| Browser/version                 |                      |
| Portrait viewport               |                      |
| Landscape viewport              |                      |
| Network profile                 | Normal / constrained |
| Notch or home indicator present | Yes / No             |
| Evidence folder or ticket       |                      |

Required minimum matrix:

- one supported iPhone on current Safari;
- one supported Android phone on current Chrome;
- portrait and landscape on both;
- at least one device with a notch or home indicator;
- one constrained-network pass.

## Execution checklist

Record Pass, Fail, or Not Applicable and attach a screenshot or recording reference for every failure.

### Authentication and restore

- [ ] Sign in and open ERCO, Drill, and Fitness Test.
- [ ] Start each report, save a draft, background the browser, and restore the same report and stage.
- [ ] Kill and relaunch the browser after a successful save; confirm no duplicate draft or lost field.
- [ ] Repeat with an expired session; confirm sign-in is requested without losing the server-saved draft.

### Location and stage semantics

- [ ] ERCO preserves one selected location exactly.
- [ ] ERCO preserves multiple ordered locations and wraps long names without clipping or `No Zone` fallbacks.
- [ ] Drill and Fitness preserve their single location labels.
- [ ] Returning from review preserves the original selections.
- [ ] Every new stage starts at the top after the prior stage was scrolled to the bottom.

### Camera, library, upload, and descriptions

- [ ] Capture one portrait and one landscape image in ERCO.
- [ ] Capture one portrait and one landscape image in Drill.
- [ ] Upload an existing image from the photo library.
- [ ] Where supported, test HEIC/HEIF and record the configured processor result.
- [ ] Deny camera permission, retry, and confirm a useful recovery route remains.
- [ ] Background and restore during capture/upload without changing the report stage.
- [ ] Rotate while the native picker, upload, and full viewer are active.
- [ ] Confirm an in-progress upload blocks review but preserves completed fields.
- [ ] Verify blank, normal, multiline, punctuation, and maximum-length descriptions.
- [ ] Verify description and photo order after save, reload, review, submit, and record detail.
- [ ] Confirm the grid uses thumbnails and the viewer contains the authenticated full image without cropping.

### Keyboard, safe area, and responsive polish

- [ ] Focus the lowest narrative and photo-description controls.
- [ ] Confirm the keyboard does not cover the focused control, error, or primary action.
- [ ] Close the keyboard and confirm no persistent blank region or stale scroll offset remains.
- [ ] Confirm bottom navigation, drawers, modals, and sticky actions respect safe-area insets.
- [ ] Confirm no odd text justification, excessive whitespace, clipped labels, or horizontal scrolling.
- [ ] Confirm touch actions remain comfortably separated in portrait and landscape.

### Failure and retry

- [ ] Interrupt the network before draft save, during upload, and before final submission.
- [ ] Confirm local unsaved state, failed draft save, upload failure, and submit failure are distinguishable.
- [ ] Retry each operation and confirm no duplicate report, media row, or timeline entry is created.
- [ ] Remove/retry one failed upload without blocking other completed fields.

## Exit criteria

- All required checks pass on both device families.
- No report data is lost or duplicated during camera return, background/foreground, rotation, or retry.
- No focused control or primary action is permanently obscured by keyboard or safe area.
- Full images preserve orientation, order, and description.
- Device/build metadata and evidence links are attached to the release record.

Any P0/P1 failure blocks release. P2 failures require an owner and approved disposition before field rollout.
