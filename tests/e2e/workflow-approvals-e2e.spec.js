const { expect, test } = require('@playwright/test')
const { apiJson, loginWithPage, personas } = require('./support/reporting-live-auth')

const mutation = (remarks, version, extra = {}) => ({
  remarks,
  expected_version: version,
  ...extra,
})

const expectApi = (result, status, context) => {
  expect(result.response.status(), `${context}: ${result.text}`).toBe(status)
  return result.body.data
}

const login = async (page, persona) => loginWithPage(page, persona)

const transition = async ({ page, persona, path, version, remarks, extra }) => {
  const csrf = await login(page, persona)
  const result = await apiJson(page.request, 'post', path, csrf, mutation(remarks, version, extra))
  return { result, data: expectApi(result, 200, `${persona.role} transition ${path}`) }
}

test.describe.serial('deterministic multi-role workflow approvals', () => {
  test('inspection: TRT submit -> scoped AIC review -> IC approve, with cross-team denial', async ({
    page,
  }) => {
    const runId = `E2E-INSP-${Date.now()}`
    const csrf = await login(page, personas.submitter)
    const createdResult = await apiJson(page.request, 'post', '/reports', csrf, {
      display_id: runId,
      report_type: 'inspection',
      status: 'Submitted',
      payload: {
        schemaVersion: 1,
        incidentType: 'General Inspection',
        inspectionType: 'General Inspection',
        selectedLocation: 'Smoke Site Alpha',
        mainLocation: 'Smoke Site Alpha',
        location: 'Smoke Site Alpha',
        reportDate: '2026-07-18',
        reportTime: '09:00',
        description: 'Deterministic multi-role inspection approval audit.',
        photos: [],
        checklist: [
          {
            id: 'e2e-general-condition',
            label: 'General condition is acceptable',
            selected: true,
          },
        ],
      },
    })
    const created = expectApi(createdResult, 201, 'TRT inspection submission')
    expect(created.workflowStage).toBe('review')
    expect(created.nextActionRole).toBe('Assistant Incident Commander')

    const unrelatedCsrf = await login(page, personas.assistantIncidentCommanderBeta)
    const crossTeam = await apiJson(
      page.request,
      'post',
      `/reports/${encodeURIComponent(created.id)}/review`,
      unrelatedCsrf,
      { version: created.version, remarks: 'Cross-team attempt must fail.' },
    )
    expect(crossTeam.response.status()).toBe(403)

    const reviewerCsrf = await login(page, personas.assistantIncidentCommander)
    const reviewedResult = await apiJson(
      page.request,
      'post',
      `/reports/${encodeURIComponent(created.id)}/review`,
      reviewerCsrf,
      { version: created.version, remarks: 'AIC scoped review completed.' },
    )
    const reviewed = expectApi(reviewedResult, 200, 'AIC inspection review')
    expect(reviewed.status).toBe('Reviewed')
    expect(reviewed.workflowStage).toBe('approve')

    const approverCsrf = await login(page, personas.incidentCommander)
    const approvedResult = await apiJson(
      page.request,
      'post',
      `/reports/${encodeURIComponent(created.id)}/approve`,
      approverCsrf,
      { version: reviewed.version, remarks: 'IC final approval completed.' },
    )
    const approved = expectApi(approvedResult, 200, 'IC inspection approval')
    expect(approved.status).toBe('Approved')
    expect(approved.workflowStage).toBe('done')
    expect(approved.timeline.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['Submitted', 'Reviewed', 'Approved']),
    )
  })

  test('leave: applicant submit -> three independent HR actors review, recommend, approve', async ({
    page,
  }) => {
    const csrf = await login(page, personas.submitter)
    const createdResult = await apiJson(page.request, 'post', '/leave', csrf, {
      leave_type: 'Annual Leave',
      start_date: '2026-10-21',
      end_date: '2026-10-21',
      days: 1,
      work_shift: 'normal',
      start_time_slot: 'shift-start',
      end_time_slot: 'shift-end',
      reason: `E2E leave approval audit ${Date.now()}`,
      cover_by: 'E2E TRT Beta',
    })
    const created = expectApi(createdResult, 201, 'leave submission')
    const actionBase = `/staff/leave/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('review')

    const wrongRoleCsrf = await login(page, personas.finance)
    const denied = await apiJson(
      page.request,
      'post',
      `${actionBase}/review`,
      wrongRoleCsrf,
      mutation('Finance cannot review leave.', created.version, { declaration_checked: true }),
    )
    expect([403, 422]).toContain(denied.response.status())

    const reviewed = (
      await transition({
        page,
        persona: personas.humanResource,
        path: `${actionBase}/review`,
        version: created.version,
        remarks: 'Primary HR review completed.',
        extra: { declaration_checked: true },
      })
    ).data
    expect(reviewed.workflow_stage).toBe('recommend')

    const recommended = (
      await transition({
        page,
        persona: personas.humanResourceSecondary,
        path: `${actionBase}/recommend`,
        version: reviewed.version,
        remarks: 'Secondary HR recommendation completed.',
        extra: { declaration_checked: true },
      })
    ).data
    expect(recommended.workflow_stage).toBe('approve')

    const approved = (
      await transition({
        page,
        persona: personas.humanResourceTertiary,
        path: `${actionBase}/approve`,
        version: recommended.version,
        remarks: 'Tertiary HR final approval completed.',
        extra: { declaration_checked: true },
      })
    ).data
    expect(approved.status).toBe('Approved')
    expect(approved.workflow_stage).toBe('done')
    expect(approved.approval_history.map(({ action }) => action)).toEqual([
      'Submitted',
      'Reviewed',
      'Recommended',
      'Approved',
    ])
  })

  test('overtime: TRT submit -> Contract Manager review -> HR recommend -> scoped Client CM approve', async ({
    page,
  }) => {
    const csrf = await login(page, personas.submitter)
    const createdResult = await apiJson(page.request, 'post', '/overtime', csrf, {
      overtime_type: 'weekday',
      claim_date: '2026-07-10',
      start_time: '20:00',
      end_time: '22:00',
      is_overnight: false,
      duration_minutes: 120,
      reason: `E2E overtime approval audit ${Date.now()}`,
    })
    const created = expectApi(createdResult, 201, 'overtime submission')
    const actionBase = `/staff/overtime/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('review')
    expect(created.next_action_role).toBe('Contract Manager')

    const reviewed = (
      await transition({
        page,
        persona: personas.contractManager,
        path: `${actionBase}/review`,
        version: created.version,
        remarks: 'Contract Manager review completed.',
      })
    ).data
    expect(reviewed.workflow_stage).toBe('recommend')

    const repeatActorCsrf = await login(page, personas.contractManager)
    const repeatActor = await apiJson(
      page.request,
      'post',
      `${actionBase}/recommend`,
      repeatActorCsrf,
      mutation('Distinct actor policy must reject this.', reviewed.version),
    )
    expect([403, 422]).toContain(repeatActor.response.status())

    const recommended = (
      await transition({
        page,
        persona: personas.humanResource,
        path: `${actionBase}/recommend`,
        version: reviewed.version,
        remarks: 'HR recommendation completed.',
      })
    ).data
    expect(recommended.workflow_stage).toBe('approve')

    const approved = (
      await transition({
        page,
        persona: personas.clientContractManagerAlpha,
        path: `${actionBase}/approve`,
        version: recommended.version,
        remarks: 'Scoped Client Contract Manager approval completed.',
      })
    ).data
    expect(approved.status).toBe('Approved')
    expect(approved.workflow_stage).toBe('done')
    expect(approved.approval_history.map(({ action }) => action)).toEqual([
      'Submitted',
      'Reviewed',
      'Recommended',
      'Approved',
    ])
  })

  test('payroll: employee submit -> Admin check -> Finance review -> Contract Manager approve -> Finance pay', async ({
    page,
  }) => {
    const csrf = await login(page, personas.submitter)
    const createdResult = await apiJson(page.request, 'post', '/payroll/claims', csrf, {
      claim_type: 'salary',
      category: 'Monthly Salary',
      period: 'August 2026',
      period_value: '2026-08',
      submission_key: `e2e-payroll-${Date.now()}`,
      notes: 'Deterministic payroll approval and payment audit.',
      payroll_baseline_confirmed: true,
      payroll_snapshot: { basic: 2500, allowances: 250, deductions: 100, net: 2650 },
      items: [
        {
          item_type: 'Addition',
          title: 'E2E approved adjustment',
          claim_date: '2026-08-01',
          amount: 25,
          notes: 'Automated workflow coverage item.',
        },
      ],
    })
    const created = expectApi(createdResult, 201, 'payroll submission')
    const actionBase = `/staff/salary-claims/records/${created.user_id}/${created.id}`
    expect(created.workflow_stage).toBe('check')

    const checked = (
      await transition({
        page,
        persona: personas.adminRole,
        path: `${actionBase}/check`,
        version: created.version,
        remarks: 'Admin check completed.',
      })
    ).data
    expect(checked.workflow_stage).toBe('review')

    const reviewed = (
      await transition({
        page,
        persona: personas.finance,
        path: `${actionBase}/review`,
        version: checked.version,
        remarks: 'Finance review completed.',
      })
    ).data
    expect(reviewed.workflow_stage).toBe('approve')

    const approved = (
      await transition({
        page,
        persona: personas.contractManager,
        path: `${actionBase}/approve`,
        version: reviewed.version,
        remarks: 'Contract Manager approval completed.',
      })
    ).data
    expect(approved.status).toBe('Approved')

    const financeCsrf = await login(page, personas.finance)
    const paidResult = await apiJson(page.request, 'post', `${actionBase}/mark-paid`, financeCsrf, {
      payment_date: '2026-08-28',
      payment_reference: `E2E-PAY-${Date.now()}`,
      payment_note: 'E2E payment completion.',
      expected_version: approved.version,
    })
    const paid = expectApi(paidResult, 200, 'Finance mark paid')
    expect(paid.status).toBe('Paid')
    expect(paid.paid_at).toBeTruthy()
    expect(paid.approval_history.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['Checked', 'Reviewed', 'Approved']),
    )
  })
})
