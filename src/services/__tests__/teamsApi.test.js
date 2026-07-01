import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTeamMemberOptions } from '../api/teamsApi'

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}))

vi.mock('../api/httpClient', () => ({
  apiRequest: (...args) => apiRequest(...args),
}))

describe('teamsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    apiRequest.mockResolvedValue({})
  })

  it('fetches team member options from the management-only endpoint', async () => {
    await fetchTeamMemberOptions()

    expect(apiRequest).toHaveBeenCalledWith('/teams/member-options')
  })
})
