// Mock data for dashboard stats — shapes mirror GET /api/stats/{module} responses exactly.
// Swap any key in useDashboardStats.js to a real API call when the backend endpoint is ready.

export const dashboardMocks = {
  reports: {
    // period-bound KPI tiles
    pendingReview: 4,
    pendingApproval: 2,
    submittedThisPeriod: 11,
    // breakdown
    byType: { erco: 7, drill: 3, fitnessTest: 2 },
    ercoByIncidentType: [
      { type: 'Fire', count: 3 },
      { type: 'Rescue', count: 2 },
      { type: 'Hazmat', count: 1 },
      { type: 'Special Services', count: 1 },
    ],
    byPersonnel: [
      { name: 'Ahmad Razali', count: 8 },
      { name: 'Siti Norehan', count: 5 },
      { name: 'Rajan Kumar', count: 3 },
      { name: 'Lee Wei Ming', count: 2 },
      { name: 'Nurul Ain', count: 2 },
    ],
    monthlyTrend: [
      { month: 'Nov', count: 7 },
      { month: 'Dec', count: 5 },
      { month: 'Jan', count: 9 },
      { month: 'Feb', count: 6 },
      { month: 'Mar', count: 11 },
      { month: 'Apr', count: 8 },
    ],
  },
  roster: {
    // snapshots
    teamsOnDuty: 1,
    draftsPendingPublish: 3,
    // per-team breakdown with member count and shift totals
    teams: [
      { name: 'Alpha', memberCount: 6, dayShifts: 15, nightShifts: 12, totalShifts: 27 },
      { name: 'Bravo', memberCount: 5, dayShifts: 12, nightShifts: 15, totalShifts: 27 },
      { name: 'Charlie', memberCount: 6, dayShifts: 14, nightShifts: 13, totalShifts: 27 },
      { name: 'Delta', memberCount: 5, dayShifts: 13, nightShifts: 14, totalShifts: 27 },
    ],
    // monthly scheduled days trend
    monthlyTrend: [
      { month: 'Nov', scheduledDays: 28 },
      { month: 'Dec', scheduledDays: 30 },
      { month: 'Jan', scheduledDays: 29 },
      { month: 'Feb', scheduledDays: 26 },
      { month: 'Mar', scheduledDays: 31 },
      { month: 'Apr', scheduledDays: 27 },
    ],
  },
  leave: {
    // period-bound
    pendingApprovals: 9,
    approvedDaysThisPeriod: 47,
    staffWithPendingRequests: 6,
    // snapshot
    staffCurrentlyOnLeave: 3,
    // team breakdown (ordered by count desc)
    byTeam: [
      { team: 'Operations', count: 12 },
      { team: 'Maintenance', count: 8 },
      { team: 'Logistics', count: 6 },
      { team: 'Security', count: 4 },
      { team: 'Admin', count: 3 },
    ],
    monthlyTrend: [
      { month: 'Nov', count: 9 },
      { month: 'Dec', count: 14 },
      { month: 'Jan', count: 11 },
      { month: 'Feb', count: 8 },
      { month: 'Mar', count: 13 },
      { month: 'Apr', count: 9 },
    ],
  },
  overtime: {
    // period-bound
    pendingApprovals: 11,
    approvedHoursThisPeriod: 142.5,
    staffWithOpenRequests: 8,
    submittedThisPeriod: 19,
    // operations
    approvedRequestsThisPeriod: 28,
    // breakdown
    byType: { weekday: 34, weekend: 21, holiday: 8 },
    byStatus: { pending: 11, approved: 28, rejected: 5, cancelled: 3 },
    // top teams (ordered by count desc)
    byTeam: [
      { team: 'Operations', count: 18 },
      { team: 'Maintenance', count: 14 },
      { team: 'Logistics', count: 9 },
      { team: 'Security', count: 6 },
      { team: 'Admin', count: 4 },
    ],
    monthlyTrend: [
      { month: 'Nov', count: 12 },
      { month: 'Dec', count: 8 },
      { month: 'Jan', count: 15 },
      { month: 'Feb', count: 19 },
      { month: 'Mar', count: 23 },
      { month: 'Apr', count: 19 },
    ],
  },
  payroll: {
    pendingApprovals: 14,
    approvedUnpaidCount: 6,
    approvedUnpaidTotalMyr: 28450,
    paidThisMonthCount: 23,
    paidThisMonthTotalMyr: 112300,
    byType: {
      salary: 18,
      expense: 31,
      other: 7,
    },
    byStatus: {
      pending: 8,
      pendingReview: 4,
      pendingApproval: 2,
      approved: 6,
      paid: 23,
      rejected: 3,
      cancelled: 5,
    },
    monthlyTrend: [
      { month: 'Nov', count: 18 },
      { month: 'Dec', count: 22 },
      { month: 'Jan', count: 15 },
      { month: 'Feb', count: 28 },
      { month: 'Mar', count: 31 },
      { month: 'Apr', count: 24 },
    ],
    // from SalaryClaimsManagement — management-side data
    incompleteContracts: 3,
    staffWithOpenClaims: 19,
    activeAssignments: 87,
    assignmentDrafts: 4,
  },
}
