# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: detail-summary-component.spec.js >> Leave detail preserves semantic, responsive, and link behavior for applicant mobile-320
- Location: tests\e2e\detail-summary-component.spec.js:124:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('dl.responsive-key-value-list').last().getByText(/captured 2026-08-01 09:30/)
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('dl.responsive-key-value-list').last().getByText(/captured 2026-08-01 09:30/)

```

```yaml
- main:
  - button "Back"
  - heading "Leave LEV-BROWSER-001" [level=1]
  - text: Submitted Supervisor review required Leave Details
  - term: Leave ID
  - definition: LEV-BROWSER-001
  - term: Leave Type
  - definition: Annual Leave
  - term: Schedule
  - definition: 1 Aug 2026 – 2 Aug 2026
  - term: Days
  - definition: "0"
  - term: Next Action
  - definition: Supervisor review required
  - term: Evidence
  - definition:
    - link "supporting-evidence.pdf":
      - /url: http://localhost:8000/api/leave/attachments/attachment-browser-1
  - term: Reason
  - definition: REASON-WITH-AN-EXCEPTIONALLY-LONG-UNBROKEN-OPERATIONAL-VALUE-1234567890
  - text: Status Reviewed Recommended Approved
  - group:
    - button "Request information Applied 1 Aug 2026" [expanded]
    - term: Current Action Owner
    - definition: Supervisor
    - term: Workflow Scope
    - definition: Response Team Alpha
    - term: Applicant Role
    - definition: Responder
    - term: Applied On
    - definition: 1 Aug 2026
    - term: Coverage By
    - definition: "-"
    - term: Roster Impact
    - definition: EXCEPTIONALLY-LONG-UNBROKEN-SHIFT-NAME-1234567890 shift, Response Team Alpha, 2026-08-02
  - text: Workflow Progress No workflow activity yet.
  - group "Workflow actions":
    - status "Supervisor review required"
    - button "Edit"
    - button "Cancel"
    - button "Delete"
```

# Test source

```ts
  74  |         attachmentAvailable: true,
  75  |         attachmentId: 'attachment-browser-1',
  76  |         attachmentName: 'supporting-evidence.pdf',
  77  |         rosterImpactSnapshot: {
  78  |           observed_at: '2026-08-01 09:30',
  79  |           items: [
  80  |             {
  81  |               shift_label: 'EXCEPTIONALLY-LONG-UNBROKEN-SHIFT-NAME-1234567890',
  82  |               team_name: 'Response Team Alpha',
  83  |               date: '2026-08-02',
  84  |             },
  85  |           ],
  86  |         },
  87  |         approvalHistory: [],
  88  |         workflowSnapshot: { requireRecommendation: true },
  89  |       }
  90  |       const props = {
  91  |         selectedRecord: record,
  92  |         selectedRecordPendingActionHint: 'Supervisor review required',
  93  |         selectedRecordHistoryEntries: [],
  94  |         onBack: () => {},
  95  |         getDisplayLeaveId: () => 'LEV-BROWSER-001',
  96  |         getScheduleLabel: () => '1 Aug 2026 – 2 Aug 2026',
  97  |         getStatusBadge: (status) => React.createElement('span', null, status),
  98  |         formatDate: () => '1 Aug 2026',
  99  |         formatDateTime: () => '1 Aug 2026, 9:30 AM',
  100 |         canEdit: true,
  101 |         canCancel: true,
  102 |         canDelete: true,
  103 |         onEdit: () => {},
  104 |         onCancel: () => {},
  105 |         onDelete: () => {},
  106 |       }
  107 |       const root = ReactDomClient.createRoot(
  108 |         document.getElementById('detail-summary-browser-harness'),
  109 |       )
  110 |       root.render(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
  111 |       await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  112 |     },
  113 |     {
  114 |       reactUrl: sourceUrl('/node_modules/.vite/deps/react.js'),
  115 |       reactDomUrl: sourceUrl('/node_modules/.vite/deps/react-dom_client.js'),
  116 |       backButtonUrl: sourceUrl('/src/components/BackButton.js'),
  117 |       styleUrl: sourceUrl('/src/scss/style.scss'),
  118 |       componentUrl: sourceUrl(componentPath),
  119 |     },
  120 |   )
  121 | }
  122 | 
  123 | for (const componentCase of componentCases) {
  124 |   test(`Leave detail preserves semantic, responsive, and link behavior for ${componentCase.name}`, async ({
  125 |     page,
  126 |   }) => {
  127 |     await page.setViewportSize({ width: componentCase.width, height: componentCase.height })
  128 |     const pageErrors = []
  129 |     page.on('pageerror', (error) => pageErrors.push(error.message))
  130 | 
  131 |     await renderLeaveDetail(page, componentCase.componentPath)
  132 |     expect(pageErrors).toEqual([])
  133 | 
  134 |     const list = page.locator('dl.responsive-key-value-list').first()
  135 |     await expect(list).toBeVisible()
  136 |     await expect(list.locator('dt')).toHaveText(
  137 |       componentCase.staff
  138 |         ? [
  139 |             'Leave ID',
  140 |             'Leave Type',
  141 |             'Schedule',
  142 |             'Days',
  143 |             'Current Status',
  144 |             'Current Action Owner',
  145 |             'Next Action',
  146 |             'Applied On',
  147 |             'Coverage By',
  148 |             'Roster Impact',
  149 |             'Evidence',
  150 |             'Reason',
  151 |           ]
  152 |         : ['Leave ID', 'Leave Type', 'Schedule', 'Days', 'Next Action', 'Evidence', 'Reason'],
  153 |     )
  154 |     await expect(list.getByText('0', { exact: true })).toBeVisible()
  155 |     await expect(list.getByText(/REASON-WITH-AN-EXCEPTIONALLY-LONG/)).toBeVisible()
  156 |     if (componentCase.staff) await expect(list.getByText(/captured 2026-08-01 09:30/)).toBeVisible()
  157 | 
  158 |     const evidence = page.getByRole('link', { name: 'supporting-evidence.pdf' })
  159 |     await expect(evidence).toHaveAttribute('target', '_blank')
  160 |     await expect(evidence).toHaveAttribute('href', /leave\/attachments\/attachment-browser-1/)
  161 | 
  162 |     if (!componentCase.staff) {
  163 |       await page.getByRole('button', { name: /Request information/i }).click()
  164 |       const requestInformation = page.locator('dl.responsive-key-value-list').last()
  165 |       await expect(requestInformation).toBeVisible()
  166 |       await expect(requestInformation.locator('dt')).toHaveText([
  167 |         'Current Action Owner',
  168 |         'Workflow Scope',
  169 |         'Applicant Role',
  170 |         'Applied On',
  171 |         'Coverage By',
  172 |         'Roster Impact',
  173 |       ])
> 174 |       await expect(requestInformation.getByText(/captured 2026-08-01 09:30/)).toBeVisible()
      |                                                                               ^ Error: expect(locator).toBeVisible() failed
  175 |     }
  176 | 
  177 |     await page.getByRole('button', { name: 'Back' }).focus()
  178 |     await page.keyboard.press('Tab')
  179 |     await expect(evidence).toBeFocused()
  180 | 
  181 |     const overflow = await page.evaluate(
  182 |       () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  183 |     )
  184 |     expect(overflow).toBeLessThanOrEqual(1)
  185 |     expect(pageErrors).toEqual([])
  186 |   })
  187 | }
  188 | 
```