# VMECC Frontend Upgrade GitHub Actions Cost Exception

**Decision date:** 2026-08-04  
**Decision authority:** Repository owner  
**Scope:** Hosted GitHub Actions execution for `vmecc-frontend`  
**Decision:** **DISABLED IN THIS CHECKOUT AND DEFERRED — remote confirmation required**  
**Review deadline:** Before any staging/production release or 2026-11-04, whichever occurs first

## 1. Decision

The repository configuration for automatic GitHub Actions execution is disabled to avoid hosted CI charges at the current stage of the project.

The active `.github/workflows/npm.yml` file was moved to `.github/workflows-disabled/npm.yml.disabled`. GitHub does not discover workflow files outside `.github/workflows/`, so this revision has no active workflow definition. The previous configuration is retained in version control for recovery and future review.

This local change does not itself disable the workflow already registered from the remote default branch. The repository has no authenticated GitHub CLI in this workspace, so the owner must either disable **Frontend CI** from the GitHub Actions interface or place this change on the default branch. Opening a pull request before remote disablement may trigger the existing pull-request workflow and incur a run.

This is a cost decision, not evidence that the Day 4 CI quality-gate acceptance criteria passed. Stage 1 must remain open because pull requests are not protected by automated lint, test, audit, or build results.

## 2. Deferred Scope

The following Day 4 items are deferred:

- automatic dependency installation and lockfile verification
- hosted ESLint and unit-test checks
- hosted contrast, typography, hardcoded-staff, module-inventory, and production-configuration audits
- hosted production builds and vulnerability reports
- downloadable failed-run artifacts and diagnostics
- required-check and branch-protection enforcement based on those jobs

Automated dependency-update pull requests are also deferred while they could trigger hosted workflows. Day 5 must use a documented local scheduled review unless hosted automation is separately approved.

## 3. Compensating Local Controls

Until this exception is closed:

1. Run the relevant lint, tests, audits, and isolated production build locally before each upgrade checkpoint.
2. Store generated evidence only under the ignored `.codex-run/frontend-upgrade/` directory.
3. Do not modify the tracked `build/` directory during ordinary validation.
4. Record exact commands, runtime version, test counts, build results, known warnings, and unexecuted checks in the applicable execution note.
5. Keep staging and production promotion blocked when hosted CI, approved staging, named owners, or rollback evidence is absent.
6. Do not describe a local pass as protected-branch, pull-request, or hosted-CI evidence.
7. Continue to review dependency advisories locally and never use `npm audit fix --force` without a separately reviewed dependency change.
8. Confirm the remote **Frontend CI** workflow is disabled before pushing this branch or opening a pull request intended to avoid all hosted runs.

These controls reduce accidental regressions but do not provide independent, automatic enforcement. A developer can still forget or bypass local validation, and GitHub will not prevent a merge on that basis.

## 4. Restoration Procedure

When hosted CI spending is approved:

1. Review and update the disabled workflow rather than restoring it blindly.
2. Move `.github/workflows-disabled/npm.yml.disabled` back to a `.yml` file under `.github/workflows/`.
3. Add the planned named lint, test, audit, build, and vulnerability-reporting jobs.
4. Pin permissions and third-party actions according to the current supply-chain policy.
5. Run the workflow in reporting mode and confirm reliability and cost before making checks required.
6. Verify branch protection separately in GitHub repository settings.
7. Update this exception with the closing revision, evidence, owner, and date.

If the remote workflow has not yet been disabled, use GitHub's workflow **Disable workflow** control first. Do not create a pull request solely to disable it when avoiding even one additional hosted run is required.

## 5. Next Upgrade Work

Proceed to Stage 1 Day 5 dependency-advisory triage using local evidence and a manual scheduled review process. Day 4 hosted CI remains deferred, and the unmet CI exit criterion prevents Stage 1 release qualification.
