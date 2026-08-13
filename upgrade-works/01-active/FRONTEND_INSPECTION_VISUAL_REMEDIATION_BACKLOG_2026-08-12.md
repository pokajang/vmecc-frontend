# Frontend Inspection Visual Remediation Backlog

**Date:** 2026-08-12  
**Source:** [Inspection visual audit execution and verdict](./FRONTEND_INSPECTION_VISUAL_CRUD_UIUX_AUDIT_EXECUTION_2026-08-12.md)  
**Status:** Ready for staged planning and implementation

## Priority order

| Wave | Work | Finding IDs | Exit evidence |
| --- | --- | --- | --- |
| 1 | Sticky mobile action safety and dark-mode readability | INS-VIS-01, 02, 13 | Mobile focus/keyboard screenshots; dark contrast matrix |
| 2 | One finding/action/evidence hierarchy | INS-VIS-03, 06 | HSE consolidated detail; flat shared evidence across all types |
| 3 | Submission scope and findings-first detail | INS-VIS-04, 05, 07, 08, 12, 14 | Partial-scope copy, HSE submission decision, mobile detail and encoding checks |
| 4 | Structured scopes and extinguisher administration | INS-VIS-09, 10, 11 | Scope comparison board; catalogue and asset-detail captures |
| 5 | Missing CRUD/workflow visual proof and live reconciliation | Coverage gaps | Controlled full lifecycle ledgers; authenticated live read-only pass |

## Implementation rules

- Preserve the captured baseline; do not overwrite audit screenshots.
- Plan and implement one wave at a time.
- Keep functional rules unchanged unless the wave explicitly includes a product decision.
- Validate all eight inspection types after changes to shared detail, evidence, scope, or action patterns.
- Do not expose device filenames when simplifying captions or image alt text.
- Do not remove accessibility names, focus rings, disclosure semantics, or touch targets.
- Do not claim live verification until UAT authentication is restored and the guarded suite passes.
- Rebuild and deploy only after the affected unit, controlled Playwright, lint, and production-build gates pass.

## Product decisions required during planning

1. Should HSE use the common review step, or remain direct-submit with an explicit confirmation summary?
2. Is partial-scope review intentional for ER Aux, High Angle, SCBA, and related structured types?
3. Which metadata is operationally essential above findings on mobile?
4. Which Fire Extinguisher metrics and filters are essential by default versus advanced?

These decisions should be resolved inside the relevant wave plan before implementation changes behavior.
