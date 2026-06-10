# Dashboard Spec — vmecc

This file is the living reference for the dashboard build. The `/dashboard-module` skill reads it on every run to stay consistent across modules.

---

## Project context

- **Framework:** React 19 + CoreUI v5 (`@coreui/react ^5.9.1`)
- **Charts:** `@coreui/react-chartjs` — `CChartLine`, `CChartBar`, `CChartDoughnut` available
- **State:** Redux (flat store, `useSelector`)
- **Auth:** `hasPermission(authUser, 'permission.key')` from `src/utils/authz.js`
- **HTTP:** all calls go through `src/services/apiClient.js`
- **Routing:** React Router v7

---

## Core principle

Dashboard shows **global aggregate data** — not per-user filtered. Role-based visibility controls which sections render, but the data behind each section is system-wide.

---

## API-backed stats

Every module section reads production data from:

```
GET /api/stats/{module}?period={period}
```

The response shape for each module is the component contract. Do not wire live dashboard sections to generated or sample data.

---

## Hook

```
src/views/dashboard/hooks/useDashboardStats.js
```

Fires visible module stat calls and returns `{ stats, loading, error }`. Hidden modules are not requested.

---

## File organisation

```
src/views/dashboard/
  Dashboard.js                        ← main layout, assembles all zones
  DASHBOARD_SPEC.md                   ← this file
  MainChart.js                        ← existing, repurposed for activity trend
  hooks/
    useDashboardStats.js              ← API-backed module stats hook
  components/
    KpiTiles.js                       ← Zone 1
    OperationsOverview.js             ← Zone 2
    ActivityChart.js                  ← Zone 3
    StatusBreakdown.js                ← Zone 4
    PendingActionsCard.js             ← Zone 5
    [ModuleName]Stats.js              ← per-module sub-components if needed
```

---

## 5-zone layout

```
┌─────────────────────────────────────────────────────┐
│ ZONE 1 — KPI Tiles                                  │
│ 4× CWidgetStatsA — top-line numbers per module      │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ ZONE 2 — Operations Overview                        │
│ 4× CWidgetStatsD — domain health, 2 sub-values each │
└─────────────────────────────────────────────────────┘
┌───────────────────────┬─────────────────────────────┐
│ ZONE 3 — Activity     │ ZONE 4 — Status Breakdown   │
│ Line/bar chart        │ CProgress groups per module  │
│ 30-day trend          │ counts by workflow state     │
└───────────────────────┴─────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ ZONE 5 — Pending Actions Table                      │
│ CTable — actionable items across modules            │
└─────────────────────────────────────────────────────┘
```

---

## CoreUI widget catalogue

| Component | Shape | Use for |
|---|---|---|
| `CWidgetStatsA` | Coloured header + big number + trend badge + sparkline | Zone 1 KPI tiles — single headline number with trend |
| `CWidgetStatsB` | Icon + number left, progress bar right | Completion rates — "X of Y approved" |
| `CWidgetStatsC` | Icon circle + title + value + CProgress below | Quota/balance stats — leave days remaining |
| `CWidgetStatsD` | Split header (icon) + body (2 sub-values) + bg chart | Zone 2 domain health cards |
| `CWidgetStatsF` | Flat — icon + title + value, no chart | Secondary counts, low-visual-weight stats |
| `CChartDoughnut` | Pie/doughnut | Status distribution proportions |
| `CProgress` groups | Stacked progress bars | Zone 4 breakdown by status/type |
| `CTable` | Standard table | Zone 5 pending actions |

---

## API contract template

Each module's stats endpoint follows this pattern:

```
GET /api/stats/{module}
Auth: session cookie
Permission: self.dashboard
Response: { ...module-specific aggregate counts }
```

Endpoints to be built per module as UI is completed. Mock data shape = endpoint response shape.

---

## Module registry

Tracks what has been built. Updated by the skill after each module run.

| Module | Service file | Views path | Dashboard section | Status |
|---|---|---|---|---|
| Overtime | `src/services/overtimeApi.js` | `src/views/overtime/` | `OvertimeKpiTiles`, `OvertimeOperationsCard`, `OvertimeTeamCard`, `OvertimeActivityChart`, `OvertimeStatusBreakdown` | done |
| Payroll Claims | `src/services/payrollClaimsApi.js` | `src/views/payroll/` | `PayrollKpiTiles`, `PayrollOperationsCard`, `PayrollActivityChart`, `PayrollStatusBreakdown` | done |
| Leave | `src/views/leave/leavePersistence.js` | `src/views/leave/` | `LeaveKpiTiles`, `LeaveActivityChart`, `LeaveTeamBreakdown` | done |
| Roster / Teams | `src/services/apiClient.js` (fetchTeams, fetchRosters) | `src/views/roster/`, `src/views/team/` | `RosterKpiTiles`, `RosterActivityChart`, `RosterTeamBreakdown` | done |
| Inspections | — | `src/views/inspection/` | — | pending |
| Reports | `src/views/report/reportApi.js` | `src/views/report/` | `ReportKpiTiles`, `ReportActivityChart`, `ReportBreakdown` | done |
| Notifications | `src/services/workflowNotifications.js` | `src/views/notifications/` | — | pending |

