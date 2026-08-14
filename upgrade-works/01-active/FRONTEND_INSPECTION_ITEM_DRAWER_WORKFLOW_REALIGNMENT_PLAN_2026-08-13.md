# Inspection Item Drawer Workflow Realignment Plan — 2026-08-13

## 1. Objective

Realign inspection item drawers so every inspection type follows one understandable workflow for:

- recording the current inspection result;
- editing persistent equipment or catalogue details;
- clearing current inspection answers;
- deleting or archiving eligible items;
- saving, cancelling and closing with unsaved changes; and
- returning users to the correct item and inspection context.

The central design rule is that current-inspection work and persistent equipment management must never be presented as if they are the same operation.

## 2. Problem statement

The current inspection drawers expose similar capabilities through different interaction patterns:

- Fire Extinguisher presents Pencil, kebab and Close together.
- ER Auxiliary and Hydraulic place equipment management and reset actions in the kebab.
- High Angle and SCBA expose management actions only for eligible custom items.
- FRT mobile exposes Reset/Delete, while a desktop expand operation is labelled `Edit`.
- General findings and HSE evidence use separate edit and persistence patterns.
- Dirty-state protection and destructive confirmation are not equally applied across modules.

The Fire Extinguisher pencil edits persistent asset metadata, while its Reset action clears only the current inspection answers. Both are valid, but adjacent unlabeled controls obscure their different scopes. The Reset kebab also remains visible after entering persistent metadata edit mode, and metadata edits are not currently protected by the same dirty-discard flow as inspection answers.

## 3. Product contract

### 3.1 Inspection mode

Every item drawer begins in `inspect` mode.

Header:

```text
Item name                                             More actions   Close
```

Rules:

- The title identifies the equipment, checklist row or finding.
- A single kebab contains applicable secondary actions.
- Close remains the final header control.
- Do not show a separate pencil beside the title.
- The body contains only fields and evidence belonging to the current inspection.
- The footer uses the shared compact Cancel/Save treatment.

Applicable kebab actions:

- `Edit equipment details`;
- `Clear inspection answers`;
- `Delete custom item`;
- `Archive equipment`.

Only actions valid for the current item, permission and state may be displayed.

### 3.2 Persistent equipment-edit mode

Selecting `Edit equipment details` changes the same drawer to `edit-equipment` mode.

Header:

```text
Edit {item name}                                                 Close
```

Rules:

- Hide the kebab and every inspection-mode action.
- Show only persistent equipment or catalogue fields.
- Show a clear scope notice before the fields:
  `Updates the equipment register and future inspections.`
- Use `Cancel` and `Save equipment details` in the footer.
- Close and Cancel use the same dirty-change guard.
- Successful save returns to inspection mode with refreshed equipment data.
- Failed save retains the editor values and communicates the failure.
- Inspection answers, photos and remarks must remain unchanged.

### 3.3 Finding-edit mode

General/HSE records that are findings rather than registered equipment use `edit-finding` mode.

Header:

```text
Edit finding                                                    Close
```

Rules:

- Hide parent-row actions while editing.
- Footer actions are `Cancel` and `Save finding`.
- Close and Cancel share dirty-discard protection.
- `Delete finding` is available from inspect mode and requires confirmation.
- HSE photo/evidence edits must use an explicit persistence model: staged Save/Reset or clearly communicated direct saving, not an ambiguous mixture.

## 4. Shared terminology

| Intent | Required label |
| --- | --- |
| Edit registered/catalogue information | `Edit equipment details` |
| Save registered/catalogue information | `Save equipment details` |
| Remove answers from the current inspection | `Clear inspection answers` |
| Save the current inspection row | `Save` |
| Delete a locally created row | `Delete custom item` |
| Remove equipment from future selection | `Archive equipment` |
| Edit a finding | `Edit finding` |
| Delete a finding | `Delete finding` |
| Leave an editor without committing | `Cancel` |

Avoid ambiguous labels including:

- `Edit` when the actual action only expands a row;
- `Reset check` when the equipment record is retained;
- `Save global change` without naming the entity being updated; and
- `Delete` without identifying whether the target is a finding, inspection row or equipment record.

## 5. Shared architecture

### 5.1 `InspectionItemDrawer`

Create a shared inspection drawer shell, provisionally at:

`src/views/inspection/form/components/InspectionItemDrawer.js`

Responsibilities:

- render the shared drawer header hierarchy;
- enforce allowed controls for the active mode;
- keep Close as the final header action;
- render the shared compact footer;
- coordinate dirty-state close requests;
- open the shared discard confirmation;
- restore focus to the originating item after close;
- expose stable mode and entity metadata for accessibility and tests.

Proposed API:

```js
<InspectionItemDrawer
  visible
  mode="inspect"
  itemTitle="ADO-001"
  entityKind="equipment"
  dirty={false}
  saving={false}
  statusText="No changes"
  actions={[]}
  onRequestClose={...}
  onCancel={...}
  onSave={...}
>
  {content}
</InspectionItemDrawer>
```

The component must not own module-specific state mutation or API calls.

### 5.2 Shared action resolver

Extend or replace `buildInspectionElementActions` with a semantic resolver that accepts:

- active mode;
- entity kind;
- permissions;
- whether inspection answers/evidence exist;
- whether the item is custom, registered, deletable or archivable;
- dirty and saving states; and
- module handlers.

The resolver returns consistently ordered actions:

1. Edit equipment details;
2. Clear inspection answers;
3. Delete custom item;
4. Archive equipment.

Destructive actions remain visually distinct and never become the default action.

### 5.3 Shared dirty-state guard

Create a reusable drawer-editor dirty guard or standardize an existing confirmation helper.

It must support:

- Close from the X button;
- Cancel from the footer;
- changing from inspection mode to equipment-edit mode;
- changing to another item;
- navigating away while an editor is dirty; and
- returning to the same mode after dismissing the confirmation.

Confirmation language:

```text
Discard unsaved changes?
Your changes to {item name} have not been saved.

Keep editing     Discard changes
```

The confirmed action must be stored explicitly rather than inferred after state has already been cleared.

### 5.4 Shared destructive confirmations

Continue using `InspectionResetConfirmDrawer`, but update the user-facing action language:

- title: `Clear inspection answers`;
- explanation: statuses, remarks and photos from this inspection will be cleared;
- confirmation: `Clear answers`;
- explicitly state that the equipment record remains registered.

Add equivalent confirmations for:

- Delete finding;
- Delete custom item; and
- Archive equipment.

Each confirmation must identify the target and consequence.

## 6. Action eligibility rules

### Edit equipment details

Show only when:

- the entity has persistent metadata;
- the user has management permission;
- an edit handler is available; and
- the drawer is in inspection mode.

### Clear inspection answers

Show only when:

- the current inspection item contains at least one status, remark, photo or completion state;
- a reset handler exists;
- the drawer is in inspection mode; and
- the item is not read-only.

Do not show an enabled Reset action for a completely untouched item.

### Delete custom item

Show only when:

- the item is locally/custom created;
- deletion is permitted; and
- deleting it will not silently remove a shared registered asset.

### Archive equipment

Show only when:

- the item belongs to a persistent catalogue;
- the user has catalogue-management permission; and
- the business workflow supports archiving.

Archiving must never be represented as deleting the current inspection answer.

## 7. Module migration plan

### 7.1 Fire Extinguisher

Primary files:

- `src/views/inspection/types/fire-extinguisher/section.js`
- `src/views/inspection/types/fire-extinguisher/fireExtinguisherEditForm.js`
- `src/views/inspection/form/hooks/useFireExtinguisherSessionSync.js`

Tasks:

1. Replace the separate pencil with `Edit equipment details` inside the kebab.
2. Rename `Reset check` to `Clear inspection answers`.
3. Hide the kebab whenever mode is `edit-equipment`.
4. Change the edit title to `Edit {ID/location number}`.
5. Wire `AddFireExtinguisherForm.onDirtyChange` into the shared dirty guard.
6. Make Close and Cancel request the same guarded transition.
7. Replace seed-only scope messaging with persistent equipment wording for every catalogue update.
8. Rename `Save global change` to `Save equipment details`.
9. Preserve current inspection answers when equipment metadata is saved.
10. Refresh the visible item identity after save without closing the parent inspection unnecessarily.

### 7.2 ER Auxiliary

Primary file:

`src/views/inspection/form/components/ErAuxInspectionChecks.js`

Tasks:

1. Move the existing drawer onto the shared shell.
2. Standardize Edit, Clear, Delete and Close wording/order.
3. Clarify whether Edit changes the shared equipment catalogue or only a custom inspection item.
4. Use the correct scope notice and save label.
5. Preserve the existing dirty inspection-draft guard.

### 7.3 Hydraulic

Primary file:

`src/views/inspection/form/components/HydraulicEquipmentChecks.js`

Tasks mirror ER Auxiliary:

- shared shell;
- semantic action resolver;
- persistent equipment-edit mode;
- shared dirty guard;
- scoped reset and deletion confirmation.

### 7.4 High Angle

Primary files:

- `src/views/inspection/form/components/HighAngleInspectionChecks.js`
- `src/views/inspection/form/components/HighAngleCustomRecordModal.js`

Tasks:

1. Move item drawers onto the shared shell.
2. Treat custom-item editing as `edit-equipment` or a clearly named `edit-custom-item` mode.
3. Keep built-in rows non-editable where appropriate.
4. Standardize Delete and Clear confirmations.
5. Reuse the shared compact editor footer.

### 7.5 SCBA

Primary file:

`src/views/inspection/form/components/ScbaSectionCards.js`

Tasks:

1. Move item drawers onto the shared shell.
2. Standardize custom-item Edit/Delete and catalogue Archive wording.
3. Ensure Archive is described as affecting future availability.
4. Keep current inspection answers separate from catalogue lifecycle actions.
5. Apply the shared dirty guard across inspect and custom-item edit modes.

### 7.6 Fire Truck Daily Readiness

Primary files:

- `src/views/inspection/types/frt-daily/frtDailySectionCards.js`
- `src/views/inspection/types/frt-daily/frtDailyInspectionChecks.js`

Tasks:

1. Move mobile item drawers onto the shared shell.
2. Keep Clear inspection answers and eligible Delete custom item actions.
3. Rename the desktop action currently labelled `Edit` when it only expands the row; use `Open`, `View checks` or remove it if the card itself already opens the content.
4. Align custom-item creation/editing footers with the shared action component.

### 7.7 General Inspection

Primary file:

`src/views/inspection/form/components/InspectionFormBodySections.js`

Tasks:

1. Move the finding editor onto the shared drawer mode contract.
2. Track whether finding fields differ from the opening values.
3. Route Close and Cancel through the shared dirty guard.
4. Add a confirmation before Delete finding.
5. Keep inspection-finding terminology instead of equipment terminology.

### 7.8 HSE

Primary files:

- `src/views/inspection/types/hse/v2Section.js`
- `src/views/inspection/form/components/InspectionFormDisplaySections.js`

Tasks:

1. Align observation/evidence editing with the shared drawer persistence model.
2. Prefer staged evidence changes with Reset/Save where practical.
3. If direct persistence must remain, communicate that changes are saved immediately and use Close rather than a misleading Done action.
4. Use finding/observation terminology rather than equipment terminology.

## 8. Shared visual behavior

- Header order is always title, overflow and Close.
- Edit mode displays title and Close only.
- Header controls retain 44px targets without oversized painted surfaces.
- Footer controls use the shared compact elongated pill treatment.
- Inspection Save remains primary teal.
- Persistent equipment Save remains primary teal with explicit scope wording.
- Cancel remains neutral-soft.
- Clear/Delete/Archive remain destructive and are never promoted beside Save.
- Notices use supporting text or a restrained alert; they must not dominate the form.
- No nested action bars or duplicate Close/Cancel affordances.

## 9. State-transition contract

```text
Closed
  → open item
Inspect mode
  → change answers → dirty inspect mode
  → Save → clean inspect mode
  → Clear answers → confirmation → cleared inspect mode
  → Edit equipment details → equipment-edit mode
  → Close/Cancel while clean → closed
  → Close/Cancel while dirty → discard confirmation

Equipment-edit mode
  → change fields → dirty equipment-edit mode
  → Save equipment details → refreshed inspect mode
  → Close/Cancel while clean → inspect mode or closed, according to origin
  → Close/Cancel while dirty → discard confirmation
```

The implementation must distinguish returning to inspection mode from closing the entire drawer. Cancel inside a nested editor should normally return to the inspection item; Close dismisses the entire drawer after applying the relevant dirty guard.

## 10. Data-safety requirements

- Editing equipment metadata must not modify inspection statuses, remarks or photos.
- Clearing inspection answers must not modify or delete equipment metadata.
- Deleting a custom inspection row must not delete a shared catalogue item.
- Archiving equipment must not rewrite historical inspection records.
- Failed saves retain the user’s entered values.
- Stale/conflict responses must not be treated as successful saves.
- Switching modes must not clear draft state before the transition is confirmed.
- Reset availability must be derived from meaningful inspection content, not merely the presence of a row.

## 11. Accessibility requirements

- Kebab accessible names include the item identity.
- Close accessible names include the active mode and item identity.
- Drawer title changes when entering equipment/finding edit mode.
- Menu items use explicit target and consequence wording.
- Focus moves to the editor heading or first field after changing mode.
- Closing or cancelling returns focus to the originating item.
- Confirmation dismissal returns focus to the action that opened it.
- Status changes and save failures are announced through an appropriate live region.
- Keyboard and touch users receive the same available actions.

## 12. Implementation stages

### Stage 1 — Shared contract

1. Define drawer modes and semantic action data.
2. Create `InspectionItemDrawer`.
3. Create or extract the shared dirty guard.
4. Update the action resolver and reset confirmation terminology.
5. Keep existing module handlers unchanged.

### Stage 2 — Fire Extinguisher reference migration

1. Move Fire Extinguisher to the shared shell.
2. Remove the separate pencil.
3. Implement clean inspection/edit mode separation.
4. Wire metadata dirty tracking.
5. Reconcile save/reset labels and scope notices.
6. Use this module as the reference implementation before broader migration.

### Stage 3 — Structured equipment modules

Migrate:

1. ER Auxiliary;
2. Hydraulic;
3. High Angle;
4. SCBA; and
5. FRT.

Preserve module-specific permissions, handlers and data contracts while replacing interaction scaffolding.

### Stage 4 — Finding and evidence modules

1. Migrate General finding edit/delete flows.
2. Align HSE observation/evidence persistence.
3. Reconcile root evidence drawers with the same dirty-state language.

### Stage 5 — Remove legacy divergence

1. Remove duplicate per-module drawer header composition.
2. Remove obsolete pencil/title action code.
3. Remove mode-specific kebab leakage.
4. Remove ambiguous action labels.
5. Consolidate duplicate dirty-confirmation state.
6. Retain compatibility wrappers only where needed for staged migration.

## 13. Edge cases

- Untouched item: do not offer Clear inspection answers.
- Item with only a photo or remark: Clear remains available.
- Read-only report: only Close is available.
- User can inspect but cannot manage equipment: omit Edit equipment details.
- Custom row without catalogue identity: use Edit/Delete custom item, not equipment-register wording.
- Registered item with inspection changes: require Save/Discard before entering equipment edit.
- Dirty equipment editor: prevent silent loss through Close, Cancel or mode switch.
- Save failure: remain in the active editor with values intact.
- Equipment identity changes after save: update title and action accessible names.
- Item archived during the inspection: preserve the current inspection row and explain future availability.
- Very long item identifiers: header text truncates or wraps without pushing Close offscreen.
- Narrow mobile viewport: title, kebab and Close remain reachable without overlap.

## 14. Acceptance criteria

- Every eligible equipment drawer uses title + kebab + Close in inspection mode.
- No inspection drawer uses a separate pencil action.
- Equipment edit mode shows title + Close only.
- No Reset/Clear action remains visible while editing persistent metadata.
- Every drawer uses explicit scope-aware action labels.
- Fire Extinguisher metadata Close/Cancel cannot silently discard changes.
- General finding Close/Cancel cannot silently discard changes.
- General finding deletion requires confirmation.
- Clear inspection answers never deletes the equipment record.
- Equipment editing never clears current inspection answers.
- The shared footer and compact choice presentation remain visually consistent.
- Read-only drawers expose no mutation action.
- Permissions are respected consistently across all inspection types.
- FRT no longer calls a simple disclosure expansion `Edit`.

## 15. Deferred verification

Under the current working instruction, implementation changes should be made without running lint, automated tests, Playwright or a production build unless explicitly authorized later.

When verification is authorized, cover:

- Fire Extinguisher, ER Auxiliary, Hydraulic, High Angle, SCBA and FRT item drawers;
- General finding and HSE evidence workflows;
- inspect, dirty inspect, equipment edit, dirty equipment edit and read-only states;
- permission-restricted and custom-item states;
- Reset/Delete/Archive confirmations;
- save success, save failure and stale/conflict recovery;
- 320px and 390px mobile widths plus desktop behavior;
- keyboard focus, Escape, Close/Cancel parity and focus restoration;
- preservation of inspection answers after equipment metadata save;
- preservation of equipment records after clearing inspection answers.

## 16. Documentation and completion record

After implementation, create:

`FRONTEND_INSPECTION_ITEM_DRAWER_WORKFLOW_REALIGNMENT_EXECUTION_2026-08-13.md`

The execution record must document:

- shared components introduced;
- migrated modules;
- action wording changes;
- dirty-state and destructive-action safeguards;
- intentionally retained exceptions;
- deferred or completed verification; and
- commit/deployment readiness verdict.

