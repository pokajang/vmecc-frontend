# Stage 6 Page Headers and Action Bars Plan

Date: 2026-08-06  
Stage: 6, Days 50–52  
Status: Approved working plan  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`

## Objective

Align module location, title, supporting context, and primary/secondary actions only where the
existing hierarchy and interaction contract are equivalent. Prefer adoption or bounded hardening of
existing primitives over another header component.

## Scope

Inventory and disposition:

- module/page titles and subtitles;
- mobile and desktop title variants;
- Back navigation;
- title-adjacent status badges;
- page-level action clusters;
- permission-controlled actions;
- disabled/loading states;
- keyboard/document order;
- narrow-screen wrapping and long dynamic titles;
- light/dark token ownership.

## Exclusions

Do not combine:

- Dashboard overview composition;
- Messages split-pane heading;
- authentication and HTTP error pages;
- inspection/report review-section headings;
- card, accordion, drawer, or modal headers;
- workflow stage controls;
- detail breadcrumbs with ordinary module headers;
- feature-specific mobile drawers merely because they appear near the top of a view.

## Day 50 — Inventory and disposition

1. Count `ModulePageHeader`, `WorkflowDetailHeader`, `MobileModuleBackAction`, workflow action, and
   record/detail action adoption.
2. Identify production views rendering their own top-level `h1` or equivalent title/action shell.
3. Record each manual header as a candidate, specialist, test-only surface, or false match.
4. Check ownership of mobile layout and feature-specific style overrides.
5. Search for dynamic titles and long unbroken-value risk.

Deliverable: evidence matrix with a decision for every credible family.

## Day 51 — Characterization and pilot gate

The preliminary pilot pair is:

- Reports, which combines a dynamic page title with mobile Back/action content;
- Team Detail, which combines a dynamic team name with permission-controlled actions.

Both already use `ModulePageHeader`. Therefore the likely correction is a bounded hardening of the
existing primitive rather than a consumer migration.

Characterize:

- one level-one heading;
- title before actions in document and keyboard order;
- action content and disabled state forwarding;
- subtitle/mobile-subtitle behavior;
- title and action min-width behavior;
- long unbroken title wrapping;
- no permission or navigation decisions inside the component.

Pilot approval requires direct evidence of a shared presentation gap. If existing behavior is
already complete, record a no-code disposition.

## Day 52 — Bounded implementation and validation

If characterization confirms the long-title gap:

1. add only the general wrapping contract to `ModulePageHeader`;
2. add direct characterization for long text, action order, action disabled state, and subtitles;
3. leave Reports and Team Detail JSX, permissions, callbacks, routes, and action priorities intact;
4. verify existing Inspection-specific and workflow-module responsive CSS still owns layout;
5. run component, Reports, Team, Inspection-header, formatting, lint, build, and diff gates.

Do not add a new header prop unless two current consumers require the same behavior and cannot
express it through existing title/subtitle/actions slots.

## Candidate matrix

| Family                                | Preliminary disposition                    | Reason                                                                                |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Standard module headers               | Retain `ModulePageHeader`                  | Broad existing adoption and stable title/subtitle/actions contract                    |
| Workflow detail headers               | Retain `WorkflowDetailHeader`              | Back, title, status, subtitle, and actions form a distinct detail contract            |
| Reports/Inspection mobile Back        | Retain `MobileModuleBackAction`            | Exact pair already consolidated                                                       |
| Workflow stage actions                | Retain `WorkflowStageActions`              | Stage progression is not a page-header action bar                                     |
| Record/detail actions                 | Retain existing workflow/report primitives | Permission and lifecycle semantics differ from page actions                           |
| Dashboard                             | Specialist                                 | Dashboard overview and disclosure hierarchy are product-specific                      |
| Messages                              | Specialist                                 | Split-pane/application-region heading rather than module page header                  |
| Fire Extinguisher asset detail header | Retain locally                             | Nested `h2`, lifecycle badge, catalog return state, and replacement navigation differ |
| Inspection UX matrix                  | Test-only specialist                       | Development QA route, not a production module header                                  |
| Dynamic Reports and Team titles       | Pilot existing primitive                   | Same header contract; credible long unbroken-title overflow risk                      |

## Safety and stop conditions

- Do not move permission checks, loading state, callbacks, or routes into `ModulePageHeader`.
- Do not reorder title and actions.
- Do not force actions to full width across every module.
- Do not remove Inspection/report-specific responsive rules.
- Do not change heading levels in nested detail/review compositions.
- Stop without production changes if the pilot gap is not reproducible or the fix requires
  feature-specific props.

## Acceptance gate

- Every credible header family has a documented disposition.
- No competing page-header primitive is introduced.
- Long dynamic titles cannot force horizontal overflow in the canonical module header.
- Existing action names, disabled states, permissions, callbacks, and navigation remain unchanged.
- Focused tests, scoped lint, production build, and `git diff --check` pass.
- Execution notes record any no-code or retained-specialist decisions.
