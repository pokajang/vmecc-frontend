# Frontend Inspection Visual CRUD UI/UX Audit Execution and Verdict

**Date:** 2026-08-12  
**Plan:** [Inspection visual CRUD UI/UX audit plan](./FRONTEND_INSPECTION_VISUAL_CRUD_UIUX_AUDIT_PLAN_2026-08-12.md)  
**Application baseline:** `dc4954de99b838510a094af90e48fe29e06dcfe7`  
**Deployed build ID:** `93ed576ef5bf-20260812084710`  
**Verdict:** Controlled visual audit complete; live authenticated and full mutable lifecycle audit blocked

## 1. Executive verdict

The Inspection module has a recognizable common shell and is materially more consistent than before, but it is not visually reconciled enough to close the upgrade journey.

The highest-value next work is not another broad component refactor. It is a focused visual simplification stage addressing:

1. sticky mobile actions obscuring task content;
2. dark-mode contrast on pale inspection surfaces;
3. one finding/action/evidence hierarchy, starting with HSE;
4. clear submission scope when rows or groups still look unchecked;
5. findings-first mobile detail hierarchy;
6. long record/equipment identity treatment;
7. consistent scope selection across FRT, High Angle, and SCBA;
8. Fire Extinguisher catalogue and asset-detail density.

No application UI code was changed during this audit.

## 2. Executed evidence

### 2.1 Controlled Playwright

| Suite | Result | Evidence |
| --- | --- | --- |
| Cross-type forms, state matrix, details, and structured scopes | 5 passed | `VMECC-QA-20260812-124000-vis007` |
| Representative visual QA | 1 passed | `VMECC-QA-20260812-123000-vis005` |
| Inspection media consistency | 2 passed | controlled media run |
| Detail drawer responsive contract | 6 passed | controlled drawer run |

Consolidated controlled evidence:

- 130 screenshots;
- 96 cross-type checkpoints;
- all eight actual inspection forms;
- mobile, narrow-mobile, desktop, and dark-mode samples;
- 0 failed tests in the completed evidence runs;
- 0 captured page errors;
- 0 horizontal-overflow failures;
- 8 actual forms with full-width primary mobile actions;
- responsive detail drawer checks at 360, 390, 768, 928, 929, and 1440 pixels.

The broad rerun attempted during this execution was stopped after duplicate concurrent Playwright processes were discovered. Only the duplicate process trees owned by this audit were terminated. The already completed isolated evidence run above remains the source of truth.

### 2.2 Live read-only reconciliation

Safety remained intact:

- live-UAT safety contract: 5/5 passed;
- anonymous `/inspection` protection: 2/2 passed on mobile and desktop;
- mutation guard ledgers: empty;
- no production record was created, edited, submitted, approved, rejected, or deleted.

Authenticated live inspection coverage was blocked:

- TRT: two entry tests failed and four dependent tests did not run;
- System Administrator probe: one failed;
- API response: HTTP 422, `These credentials do not match our records.`

Therefore the live eight-type journey, live submitted-detail comparison, and live HSE evidence verification are marked **data/auth-blocked**, not passed.

The deployed build reports a build ID derived from pre-commit `93ed576`, although the released source commit is `dc4954d`. The bundle was generated immediately before the commit, but release traceability should be made unambiguous in a later build/deploy cycle.

## 3. Verified strengths

- All eight types use a recognizable Conduct Inspection shell with title, Back action, setup summary, work section, and teal primary action.
- Mobile primary actions are full-width and ordered before secondary actions.
- The previous inline card caret and `n missing` badge noise is absent in actual-form evidence.
- Actual-form metrics report no nested CoreUI cards in the inspected equipment surfaces.
- FRT, High Angle, and SCBA retain selected scope and progress context.
- Detail drawers use the intended full-width mobile treatment through 928px and a bounded/divided desktop treatment above that breakpoint.
- Controlled media checks show no device filename, no border/card chrome in the generic read-only gallery, working viewer navigation, and no overflow.
- Fire Extinguisher catalogue and history have responsive desktop/mobile presentations.
- Visible buttons and fields in the controlled matrix have accessible names; primary touch heights meet the tested threshold.

## 4. Ranked visual findings

### HIGH — INS-VIS-01: Sticky mobile action tray obscures form content

**Affected user:** Mobile inspector conducting or correcting a report.  
**Evidence:** Actual mobile forms for HSE, ER Aux, Fire Extinguisher, High Angle, Hydraulic, and SCBA.  
**Observed:** The fixed save-status/primary-action tray sits above the fixed application navigation and visibly covers task content while scrolling. In HSE it crosses the immediate corrective-action region; in equipment types it crosses cards or supporting content.  
**User question:** “Is there more information behind this button, and have I missed a required field?”  
**Remediation:** Reserve layout space equal to the complete sticky stack, account for keyboard and safe-area changes, and test focused last fields. Consider keeping the tray in flow until the user reaches the actionable end state.

### HIGH — INS-VIS-02: Dark-mode text is rendered on incompatible light surfaces

**Affected user:** Any inspector using supported dark mode.  
**Evidence:** Dark cross-type complete-state captures for ER Aux, Fire Extinguisher, FRT, General, and SCBA.  
**Observed:** Light or near-white headings/metadata appear on pale gray or light-gradient surfaces. Existing contrast checks cover controls more reliably than the page text surfaces.  
**User question:** “Why is this information faded or unreadable?”  
**Remediation:** Replace hard-coded light preview surfaces with theme tokens and extend contrast tests to headings, metadata, status summaries, cards, and gradients.

### HIGH — INS-VIS-03: One HSE observation is split into two disclosures

**Affected user:** Inspector, reviewer, or approver reading an HSE record.  
**Evidence:** Controlled mobile/desktop HSE detail and the reported live screenshot.  
**Observed:** `Unsafe Act` or `Unsafe Condition` contains only the description; `Follow-up and evidence` separately owns the immediate action and photos. Users must open both to understand one observation.  
**User question:** “Does this action and photo belong to this unsafe condition?”  
**Remediation:** Render one HSE observation disclosure containing type/status, description, immediate corrective action, photos, and meaningful captions.

### HIGH — INS-VIS-04: The apparent scope of Continue to Review is ambiguous

**Affected user:** Inspector submitting a partial scope.  
**Evidence:** Actual mobile ER Aux, High Angle, and SCBA form captures.  
**Observed:** A prominent enabled `Continue to Review` coexists with visible `Not checked` rows or low completed counts such as 1/9, 1/5, and 1/12. The UI does not explain whether the review covers a completed subset or the full visible catalogue.  
**User question:** “Am I submitting only what I checked, or accidentally skipping the rest?”  
**Remediation:** If subset submission is valid, name the scope explicitly, for example `Review 1 checked item in [location]`. Otherwise block progression and identify the remaining required work.

### HIGH — INS-VIS-05: HSE direct submission breaks cross-type review expectations

**Affected user:** Inspector accustomed to reviewing before submission.  
**Evidence:** HSE actual form uses `Submit Report`; the other seven types use `Continue to Review`.  
**Observed:** The consequence changes without an intermediate review or sufficiently explicit confirmation.  
**User question:** “Why can I not review HSE before it is submitted?”  
**Remediation:** Prefer the common review step. If direct submission is a required domain rule, explain it beside the action and provide a confirmation summary of the exact observation, action, and evidence.

### MEDIUM — INS-VIS-06: Evidence has excessive nesting and repeated labels

**Affected user:** Inspector or reviewer reading issue evidence.  
**Evidence:** HSE detail plus shared detail rendering used by ER Aux, FRT, Hydraulic, SCBA, High Angle, and General.  
**Observed:** Accordion/item boundary → bordered/tinted evidence card → photo wrapper. HSE may additionally show `Follow-up and evidence`, `HSE evidence`, and a caption repeating the observation type.  
**User question:** “Are these separate evidence groups, or the same evidence repeated?”  
**Remediation:** Keep one item/disclosure boundary, place remarks and images directly inside it, remove redundant generic evidence headings, and display one caption only when it adds meaning. Preserve accessible image alt text invisibly.

### MEDIUM — INS-VIS-07: Mobile detail prioritizes duplicated metadata over findings

**Affected user:** Reviewer or returning inspector opening a record to understand its result.  
**Evidence:** Mobile detail captures for all eight types.  
**Observed:** Report ID and timestamp appear in the detail hero and again in Report Metadata; empty values such as `Submitted By –` consume space. Context cards follow, pushing findings below the first viewport.  
**User question:** “Where is the actual inspection result?”  
**Remediation:** Lead with type/location/status and findings. Place full audit metadata in a compact collapsed disclosure and suppress empty rows.

### MEDIUM — INS-VIS-08: Long equipment identities are clipped

**Affected user:** Inspector distinguishing similar assets.  
**Evidence:** Fire Extinguisher, Hydraulic, and ER Aux actual mobile forms.  
**Observed:** Long identities and some search placeholder text are truncated rather than wrapping meaningfully.  
**User question:** “Which exact equipment am I checking?”  
**Remediation:** Allow a two-line primary identity, prioritize a unique short identifier, and move secondary metadata below it.

### MEDIUM — INS-VIS-09: Scope-selection grammar differs across structured types

**Affected user:** Inspector moving among compartments, kits, or SCBA groups.  
**Evidence:** FRT, High Angle, and SCBA selected-scope captures.  
**Observed:** FRT keeps selected context mainly in setup, while High Angle and SCBA add a tinted selected-scope card with reset/edit actions. FRT also presents a long wall of compartments before a separate `No compartment selected / Choose compartment` prompt.  
**User question:** “What is selected, and where do I continue?”  
**Remediation:** Use one selected-scope summary and action position across structured types; show the prompt above results and prioritize incomplete/issue/next scopes.

### MEDIUM — INS-VIS-10: Fire Extinguisher catalogue is disproportionate to the result set

**Affected user:** Asset administrator finding or managing an extinguisher.  
**Evidence:** Controlled catalogue desktop and tablet captures.  
**Observed:** Eleven metric pills and ten filters precede a sparse table; summary pills resemble filters, and tablet columns truncate.  
**User question:** “Which controls actually narrow the list?”  
**Remediation:** Use a compact summary, keep core filters visible, move advanced filters to progressive disclosure, show active-filter chips only, and prioritize essential responsive columns.

### MEDIUM — INS-VIS-11: Fire Extinguisher status dimensions are unclear and duplicated

**Affected user:** Asset administrator reading the asset detail.  
**Evidence:** Controlled extinguisher detail mobile/desktop captures.  
**Observed:** `Active`, `Unavailable`, and `Inspected` appear together without clarifying lifecycle, due/compliance, and latest inspection meanings. The latest criteria are repeated in the first history entry on mobile.  
**User question:** “Is this extinguisher active and usable, or unavailable?”  
**Remediation:** Group and rename the three status dimensions, explain unavailable/due state, and avoid repeating the latest inspection as the first expanded history item.

### LOW/MEDIUM — INS-VIS-12: Report-level photos can appear unrelated to `No findings`

**Affected user:** Reviewer reading a General Inspection.  
**Evidence:** General complete-state mobile capture.  
**Observed:** `No findings` appears with `General photos (1)` and a ready-to-review action. The state may be valid but the evidence purpose is unclear.  
**User question:** “If there is no finding, what is this photo documenting?”  
**Remediation:** Rename the collapsed action to report/location evidence and provide short contextual copy.

### LOW — INS-VIS-13: Short forms retain excessive blank vertical space

**Affected user:** Mobile inspector on General or Hydraulic flows.  
**Evidence:** Controlled short-form captures.  
**Observed:** Large empty regions remain while sticky chrome occupies visual attention.  
**Remediation:** Recalculate minimum height and bottom reservation after the sticky-action fix.

### LOW — INS-VIS-14: Malformed separators and ellipses remain in inspection text

**Affected user:** Any user reading inspection history or truncated summaries.  
**Evidence:** Inspection source contains malformed separator/ellipsis sequences, including the Fire Extinguisher history heading.  
**Observed:** Encoding artifacts can appear instead of ordinary punctuation.  
**User question:** “Why are there broken characters in this report?”  
**Remediation:** Replace the malformed sequences, scan the inspection source for common mojibake patterns, and add a rendering regression check.

## 5. Functional and coverage reconciliation

The controlled visual run proves rendered entry, representative form states, actual populated forms, details, structured scope behavior, catalogue responsiveness, media behavior, and layout contracts. It does **not** prove these complete visual journeys:

- draft save/resume/recovery/conflict;
- real review confirmation and submission;
- editable submitted or rejected record update;
- reject, correct, and resubmit;
- reviewer/approver role permutations;
- report/draft deletion and recovery from failure;
- offline queue, retry, and reconciliation;
- Fire Extinguisher catalogue create/edit/lifecycle mutation;
- managed issue assign/resolve/verify/reopen/cancel.

Existing CRUD smoke coverage validates much of the API behavior but is not visual lifecycle evidence. These states remain **coverage-blocked**, not passed. They require a deterministic writable controlled environment with role fixtures and cleanup support.

## 6. Recommended remediation waves

### Wave 1 — Safety and readability

- Fix sticky action occlusion and keyboard/safe-area behavior.
- Fix dark-mode surface/text contrast.
- Add visual regression checks for focused last fields and theme-sensitive text surfaces.

### Wave 2 — Finding and evidence hierarchy

- Consolidate HSE into one observation disclosure.
- Flatten shared read-only evidence presentation.
- Remove repeated headings and meaningless captions.
- Preserve accessible names and viewer behavior.

### Wave 3 — Submission and detail clarity

- Clarify partial-scope review language and FRT next action.
- Decide and document HSE review versus direct-submit behavior.
- Put findings before secondary metadata on mobile.
- Wrap long item identities consistently.

### Wave 4 — Structured scopes and extinguisher administration

- Reconcile FRT, High Angle, and SCBA scope selection.
- Simplify Fire Extinguisher catalogue metrics/filters.
- Clarify asset status dimensions and remove latest/history duplication.
- Remove malformed inspection punctuation and guard against recurrence.

### Wave 5 — Complete lifecycle visual proof

- Build controlled persona and mutation fixtures.
- Capture draft, review, submission, edit, workflow, delete, offline, catalogue, and managed-issue journeys.
- Restore live UAT personas and rerun the guarded read-only reconciliation.

## 7. Final status

**Controlled visuals verdict:** Complete with targeted remediation required.  
**Full CRUD visual verdict:** Inconclusive because mutation-driven states lack rendered lifecycle evidence.  
**Live authenticated verdict:** Data/auth-blocked.  
**Safe to begin remediation:** Yes, for Waves 1–4 using the captured controlled baseline.  
**Safe to claim the entire plan complete:** No. Wave 5 and live reconciliation remain open.
