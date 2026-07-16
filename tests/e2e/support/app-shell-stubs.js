const shellResponses = [
  ['/settings/modules', { data: { registry: [], configured: {}, effective: {} } }],
  [
    '/settings/system-maintenance',
    { data: { enabled: false, phase: 'off', graceEndsAt: null, message: '' } },
  ],
  ['/messages/threads**', { data: [] }],
  ['/rosters**', { data: [] }],
  [
    '/settings/shift-windows',
    {
      data: {
        normal_start: '08:00',
        normal_end: '17:00',
        day_start: '07:00',
        day_end: '19:00',
        night_start: '19:00',
        night_end: '07:00',
      },
    },
  ],
  ['/workflow/notifications/unread-count**', { data: { unread_count: 0 } }],
  ['/overtime/eligibility', { data: { eligible: false, applicableRoles: [], userRoles: [] } }],
  ['/stats', { data: {} }],
  ['/dashboard/action-queue', { data: [] }],
]

const installAppShellApiStubs = async (page, apiBaseUrl) => {
  const normalizedBaseUrl = String(apiBaseUrl || '').replace(/\/+$/, '')
  await Promise.all(
    shellResponses.map(([path, body]) =>
      page.route(`${normalizedBaseUrl}${path}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
      ),
    ),
  )
}

module.exports = { installAppShellApiStubs }
