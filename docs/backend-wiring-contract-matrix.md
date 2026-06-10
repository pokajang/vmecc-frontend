# Backend Wiring Contract Matrix (Salary, Overtime, Leave)

## Canonical Field Mapping
- API payloads use `snake_case`.
- UI models use `camelCase`.
- Workflow action failures normalize to `{ message, fieldErrors, status }` via `workflowTransitionErrors`.

## Salary Assignments
- List: `GET /staff/salary-assignments`
  - API: `employee_user_id`, `effective_from`, `basic_salary`, `allowance_total`, `employee_contributions`, `employer_contributions`, `notes_history`
  - UI: `employeeId`, `effectiveFrom`, `basicSalary`, `allowanceTotal`, `employeeContributions`, `employerContributions`, `notesHistory`
- Create: `POST /staff/salary-assignments`
- Update: `PUT /staff/salary-assignments/{id}`
- Delete: `DELETE /staff/salary-assignments/{id}`
- Drafts:
  - `GET /staff/salary-assignments/drafts`
  - `POST /staff/salary-assignments/drafts` with `{ draft_name, source_assignment_id, payload }`
  - `PUT /staff/salary-assignments/drafts/{id}`
  - `DELETE /staff/salary-assignments/drafts/{id}`

## Payroll Claims Workflow (Staff)
- Records:
  - `GET /staff/salary-claims/records`
  - `GET /staff/salary-claims/records/{ownerId}/{claimId}`
- Actions:
  - `POST /staff/salary-claims/records/{ownerId}/{claimId}/check`
  - `POST /staff/salary-claims/records/{ownerId}/{claimId}/review`
  - `POST /staff/salary-claims/records/{ownerId}/{claimId}/approve`
  - `POST /staff/salary-claims/records/{ownerId}/{claimId}/reject`
  - `POST /staff/salary-claims/records/{ownerId}/{claimId}/cancel`
- Action payload:
  - `{ remarks?: string }`
- Error fields expected from API validation:
  - `remarks`, `role`, `stage`, `status`

## Overtime Workflow (Staff)
- Records:
  - `GET /staff/overtime/records`
  - `GET /staff/overtime/records/{ownerId}/{recordId}`
- Actions:
  - `POST /staff/overtime/records/{ownerId}/{recordId}/review`
  - `POST /staff/overtime/records/{ownerId}/{recordId}/recommend`
  - `POST /staff/overtime/records/{ownerId}/{recordId}/approve`
  - `POST /staff/overtime/records/{ownerId}/{recordId}/reject`
  - `POST /staff/overtime/records/{ownerId}/{recordId}/cancel`
- Action payload:
  - `{ remarks?: string }`

## Leave Workflow (Staff)
- Records:
  - `GET /staff/leave/records`
  - `GET /staff/leave/records/{userId}/{leaveId}`
- Actions:
  - `POST /staff/leave/records/{userId}/{leaveId}/review`
  - `POST /staff/leave/records/{userId}/{leaveId}/recommend`
  - `POST /staff/leave/records/{userId}/{leaveId}/approve`
  - `POST /staff/leave/records/{userId}/{leaveId}/reject`
  - `POST /staff/leave/records/{userId}/{leaveId}/cancel`
- Action payload:
  - `{ remarks?: string }`

## Attachment URL Contract
- Leave attachment access must be built from configured API base URL.
- Frontend now uses `buildApiUrl('/leave/attachments/{id}')` instead of hardcoded `/api/...`.

## Cutover Flags
- `VITE_SALARY_ASSIGNMENTS_API_READS_PRIMARY`
- `VITE_SALARY_ASSIGNMENTS_API_WRITES_PRIMARY`
- Existing:
  - `VITE_API_OT_PAYROLL_READS_PRIMARY`
  - `VITE_API_OT_PAYROLL_WRITES_PRIMARY`
  - `VITE_OT_PAYROLL_LOCAL_FALLBACK_ENABLED`
  - `VITE_OT_PAYROLL_MIGRATION_ENABLED`
