import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from 'src/services/apiClient'
import {
  fetchFireExtinguisherIssueAssignees,
  fetchFireExtinguisherIssues,
  unassignFireExtinguisherIssue,
} from '../inspectionFireExtinguisherIssueApi'

vi.mock('src/services/apiClient', () => ({ apiRequest: vi.fn() }))

beforeEach(() => {
  vi.mocked(apiRequest).mockReset()
})

describe('inspectionFireExtinguisherIssueApi', () => {
  it('forwards abort signals for issue and assignee reads', async () => {
    const controller = new AbortController()
    apiRequest.mockResolvedValue({ data: [], meta: {} })

    await fetchFireExtinguisherIssues(
      { extinguisherId: 7, page: 2, perPage: 25 },
      { signal: controller.signal },
    )
    await fetchFireExtinguisherIssueAssignees({ signal: controller.signal })

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      '/inspection/fire-extinguisher-issues?extinguisherId=7&page=2&perPage=25',
      { signal: controller.signal },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      '/inspection/fire-extinguisher-issues/assignees',
      { signal: controller.signal },
    )
  })

  it('posts unassignment with the current lock version', async () => {
    apiRequest.mockResolvedValue({ data: { id: 41, assignee: null, lockVersion: 4 } })

    await expect(
      unassignFireExtinguisherIssue(41, { note: 'Moved back to queue.', lockVersion: 3 }),
    ).resolves.toMatchObject({ id: 41, assignee: null, lockVersion: 4 })
    expect(apiRequest).toHaveBeenCalledWith('/inspection/fire-extinguisher-issues/41/unassign', {
      method: 'POST',
      body: JSON.stringify({ note: 'Moved back to queue.', lockVersion: 3 }),
    })
  })
})
