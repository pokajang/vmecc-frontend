# OT/Payroll Workflow Email Rollout Runbook

## Baseline (default-off)
- Keep `WORKFLOW_EMAIL_ENABLED=false`.
- Keep module flags disabled:
  - `WORKFLOW_EMAIL_MODULE_OVERTIME=false`
  - `WORKFLOW_EMAIL_MODULE_SALARY=false`
  - `WORKFLOW_EMAIL_MODULE_EXPENSE=false`
  - `WORKFLOW_EMAIL_MODULE_EXCEPTIONAL=false`

## Staging enablement sequence
1. Set `WORKFLOW_EMAIL_ENABLED=true`.
2. Enable one module at a time (start with `WORKFLOW_EMAIL_MODULE_OVERTIME=true`).
3. Run queue worker: `php artisan queue:work`.
4. Execute workflow transitions and validate:
   - `workflow_notifications` row created
   - `workflow_email_deliveries` row status is `sent`
   - deep links in email point to correct staff/self page
5. Repeat for salary/expense/exceptional modules.

## Production promotion sequence
1. Promote already-validated module flags.
2. Ensure queue worker supervision and restart policy are active.
3. Monitor failed deliveries in `workflow_email_deliveries`.
4. Roll back by disabling module flags first, then global flag if needed.

