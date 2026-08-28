// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErAssessmentForm from '../ErAssessmentForm'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  upload: vi.fn(),
  uploadPhotos: vi.fn(),
  location: { pathname: '/report/er-assessment/new/rescue', search: '', state: null },
  deleteMedia: vi.fn(),
  fetchTemplate: vi.fn(),
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => mocks.location,
  useNavigate: () => mocks.navigate,
}))

vi.mock('../../reportStorage', () => ({
  loadReportDraftRow: (...args) => mocks.loadDraft(...args),
  saveReportDraft: (...args) => mocks.saveDraft(...args),
}))

vi.mock('../../reportApi', () => ({
  fetchErAssessmentTemplate: (...args) => mocks.fetchTemplate(...args),
}))

vi.mock('src/services/api/reportMediaApi', () => ({
  REPORT_PHOTO_MAX_TOTAL_BYTES: 12 * 1024 * 1024,
  deleteReportMedia: (...args) => mocks.deleteMedia(...args),
  getReportPhotoBytes: (photo) => Number(photo?.sizeBytes || 0),
  reportPhotoFailureMessage: () => 'Unable to upload the photo.',
  uploadReportPhoto: (...args) => mocks.upload(...args),
  uploadReportPhotosSequentially: (...args) => mocks.uploadPhotos(...args),
}))

describe('ErAssessmentForm backend integration', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchTemplate.mockResolvedValue(null)
    mocks.loadDraft.mockResolvedValue(null)
    mocks.location = { pathname: '/report/er-assessment/new/rescue', search: '', state: null }
    mocks.saveDraft.mockResolvedValue({ draftId: 'draft-1', version: 1 })
    mocks.upload.mockResolvedValue({
      mediaId: 'rpm-layout-1',
      url: '/api/report-media/rpm-layout-1',
      thumbnailUrl: '/api/report-media/rpm-layout-1?variant=thumbnail',
      fileName: 'layout.jpg',
      sizeBytes: 1234,
    })
  })

  it('uploads the rescue layout through shared report media instead of storing a data URL', async () => {
    const { container } = render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="rescue"
        initialFormSeed={{
          assessmentType: 'working-at-height',
          company: 'VMECC',
          assessmentDate: '2026-08-27',
          location: 'Area A',
          scopeOfWork: 'Elevated work',
        }}
      />,
    )

    const file = new File(['layout'], 'layout.jpg', { type: 'image/jpeg' })
    await waitFor(() => expect(container.querySelector('input[type="file"]')).not.toBeNull())
    expect(screen.queryByRole('progressbar', { name: 'Assessment progress' })).toBeNull()
    expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull()
    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1))
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({ file, module: 'er-assessment', source: 'upload' }),
    )
    await waitFor(() => expect(screen.getByAltText('Rescue access layout preview')).toBeTruthy())
    expect(screen.queryByText('layout.jpg')).toBeNull()
    expect(screen.getByText('Rescue access layout ready for review.')).toBeTruthy()
    expect(screen.getByAltText('Rescue access layout preview').getAttribute('src')).toContain(
      'rpm-layout-1',
    )
  })

  it('restores a type selected from the refresh-safe route query', async () => {
    mocks.location = {
      pathname: '/report/er-assessment/new/setup',
      search: '?type=working-at-height',
      state: null,
    }

    render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="setup"
      />,
    )

    await waitFor(() =>
      expect(document.querySelector('#era-type')?.value).toBe('working-at-height'),
    )
    expect(mocks.loadDraft).not.toHaveBeenCalled()
  })

  it('shows camera and upload evidence actions only after staging a No response', async () => {
    mocks.location = { pathname: '/report/er-assessment/new/requirements', search: '', state: null }
    render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="requirements"
        initialFormSeed={{
          assessmentType: 'working-at-height',
          company: 'VMECC',
          assessmentDate: '2026-08-27',
          location: 'Area A',
          scopeOfWork: 'Elevated work',
        }}
      />,
    )

    await screen.findByText('Scaffold tagged & inspected (Green/Yellow/Red)')
    const requirement = screen.getByRole('group', {
      name: 'Requirement 1: Scaffold tagged & inspected (Green/Yellow/Red)',
    })
    expect(screen.queryByRole('button', { name: 'Take photo', exact: true })).toBeNull()
    fireEvent.click(within(requirement).getByRole('button', { name: 'No', exact: true }))

    expect(screen.getByRole('button', { name: 'Take photo', exact: true })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload photo', exact: true })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
    fireEvent.click(within(requirement).getByRole('button', { name: 'Yes', exact: true }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Take photo', exact: true })).toBeNull(),
    )
  })

  it('silently saves the completed stage before continuing', async () => {
    const { container } = render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="rescue"
        initialFormSeed={{
          assessmentType: 'working-at-height',
          company: 'VMECC',
          assessmentDate: '2026-08-27',
          location: 'Area A',
          scopeOfWork: 'Elevated work',
          rescuePlan: 'Raise the alarm and recover the casualty using the rescue kit.',
        }}
      />,
    )

    const file = new File(['layout'], 'device-layout.jpg', { type: 'image/jpeg' })
    await waitFor(() => expect(container.querySelector('input[type="file"]')).not.toBeNull())
    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByAltText('Rescue access layout preview')
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    expect(mocks.saveDraft).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ workflowStep: 'equipment', savedAt: expect.any(String) }),
      'er-assessment',
      expect.objectContaining({ draftId: '', baseVersion: 0 }),
    )
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        '/report/er-assessment/new/equipment',
        expect.any(Object),
      ),
    )
  })

  it('includes the latest field edit when Continue is activated immediately', async () => {
    render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="setup"
        initialFormSeed={{
          assessmentType: 'working-at-height',
          company: 'VMECC',
          assessmentDate: '2026-08-27',
          location: 'Area A',
          scopeOfWork: 'Original scope',
        }}
      />,
    )

    const scope = await screen.findByDisplayValue('Original scope')
    fireEvent.change(scope, { target: { value: 'Corrected immediately before Continue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }))

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    expect(mocks.saveDraft).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        scopeOfWork: 'Corrected immediately before Continue',
        workflowStep: 'requirements',
      }),
      'er-assessment',
      expect.any(Object),
    )
  })

  it('waits for both template and draft before restoring canonical response rows', async () => {
    let resolveTemplate
    let resolveDraft
    mocks.fetchTemplate.mockReturnValue(
      new Promise((resolve) => {
        resolveTemplate = resolve
      }),
    )
    mocks.loadDraft.mockReturnValue(
      new Promise((resolve) => {
        resolveDraft = resolve
      }),
    )

    const { rerender } = render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="setup"
      />,
    )

    resolveTemplate({
      schemaVersion: 1,
      templateVersion: 'VMECC-OPS-016-R0',
      assessmentTypes: [
        {
          id: 'working-at-height',
          label: 'Working at Height',
          worstCaseScenario: 'Fall event',
          requirements: [{ id: 'wah.remote-check', label: 'Remote canonical check' }],
        },
      ],
    })
    await Promise.resolve()
    expect(screen.getByTestId('er-assessment-hydration-loading')).toBeTruthy()

    resolveDraft({
      draftId: 'draft-race',
      version: 4,
      payload: {
        schemaVersion: 1,
        templateVersion: 'VMECC-OPS-016-R0',
        workflowStep: 'requirements',
        assessmentType: 'working-at-height',
        company: 'Restored Company',
        responses: [
          {
            requirementId: 'wah.remote-check',
            requirement: 'Remote canonical check',
            response: 'Yes',
            remarks: 'Restored safely',
          },
        ],
      },
    })

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        '/report/er-assessment/new/requirements',
        expect.objectContaining({ replace: true }),
      ),
    )
    rerender(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="requirements"
      />,
    )
    expect(await screen.findByText('Remote canonical check')).toBeTruthy()
    expect(screen.getByText('Restored safely')).toBeTruthy()
  })

  it('commits only the latest StrictMode hydration and preserves its draft identity on save', async () => {
    let resolveFirst
    let resolveSecond
    mocks.loadDraft
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
      )

    render(
      <React.StrictMode>
        <ErAssessmentForm
          user={{ id: 9, name: 'Field User' }}
          reportTypeSlug="er-assessment"
          reportTypeIdPrefix="ERA"
          nextReportSequence={1}
          reportBasePath="/report/er-assessment"
          newSection="setup"
        />
      </React.StrictMode>,
    )

    await waitFor(() => expect(mocks.loadDraft).toHaveBeenCalledTimes(2))
    resolveSecond({
      draftId: 'draft-latest',
      version: 7,
      payload: {
        workflowStep: 'setup',
        assessmentType: 'working-at-height',
        company: 'Latest draft',
        assessmentDate: '2026-08-27',
        location: 'Area A',
        scopeOfWork: 'Latest saved scope',
      },
    })
    expect(await screen.findByDisplayValue('Latest draft')).toBeTruthy()

    resolveFirst({
      draftId: 'draft-stale',
      version: 2,
      payload: {
        workflowStep: 'setup',
        assessmentType: 'working-at-height',
        company: 'Stale draft',
      },
    })
    await Promise.resolve()
    expect(screen.queryByDisplayValue('Stale draft')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }))
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    expect(mocks.saveDraft).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ company: 'Latest draft' }),
      'er-assessment',
      { draftId: 'draft-latest', baseVersion: 7 },
    )
  })

  it('blocks an explicitly incompatible draft without overwriting it', async () => {
    mocks.loadDraft.mockResolvedValue({
      draftId: 'draft-old-template',
      version: 3,
      payload: {
        schemaVersion: 1,
        templateVersion: 'VMECC-OPS-016-R99',
        company: 'Do not overwrite',
      },
    })

    render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="setup"
      />,
    )

    expect((await screen.findByTestId('er-assessment-hydration-blocked')).textContent).toContain(
      'was not changed',
    )
    expect(screen.queryByRole('button', { name: 'Save Draft', exact: true })).toBeNull()
    expect(mocks.saveDraft).not.toHaveBeenCalled()
  })

  it('prefers the latest server draft over the original record on an edit-step remount', async () => {
    mocks.loadDraft.mockResolvedValue({
      draftId: 'draft-edit-latest',
      version: 6,
      payload: {
        workflowStep: 'setup',
        assessmentType: 'working-at-height',
        company: 'VMECC',
        assessmentDate: '2026-08-27',
        location: 'Area A',
        scopeOfWork: 'Corrected server draft scope',
      },
    })

    render(
      <ErAssessmentForm
        user={{ id: 9, name: 'Field User' }}
        reportTypeSlug="er-assessment"
        reportTypeIdPrefix="ERA"
        nextReportSequence={1}
        reportBasePath="/report/er-assessment"
        newSection="setup"
        editingRecord={{
          id: 'report-1',
          status: 'Rejected',
          assessmentType: 'working-at-height',
          company: 'VMECC',
          assessmentDate: '2026-08-27',
          location: 'Area A',
          scopeOfWork: 'Original rejected scope',
        }}
      />,
    )

    expect(await screen.findByDisplayValue('Corrected server draft scope')).toBeTruthy()
    expect(screen.queryByDisplayValue('Original rejected scope')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }))
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1))
    expect(mocks.saveDraft).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ scopeOfWork: 'Corrected server draft scope' }),
      'er-assessment',
      { draftId: 'draft-edit-latest', baseVersion: 6 },
    )
  })

  it('follows a route back to setup after restoring a later draft step', async () => {
    mocks.loadDraft.mockResolvedValue({
      draftId: 'draft-edit-signoff',
      version: 5,
      payload: {
        workflowStep: 'signoff',
        assessmentType: 'working-at-height',
        company: 'VMECC',
        assessmentDate: '2026-08-27',
        location: 'Area A',
        scopeOfWork: 'Rejected scope awaiting correction',
        inspectedBy: { name: 'Inspector', company: 'VMECC', signature: 'Inspector' },
        jobLeader: { name: 'Leader', company: 'Contractor', signature: 'Leader' },
      },
    })

    const props = {
      user: { id: 9, name: 'Field User' },
      reportTypeSlug: 'er-assessment',
      reportTypeIdPrefix: 'ERA',
      nextReportSequence: 1,
      reportBasePath: '/report/er-assessment',
    }
    const { rerender } = render(<ErAssessmentForm {...props} newSection="setup" />)

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        '/report/er-assessment/new/signoff',
        expect.objectContaining({ replace: true }),
      ),
    )

    rerender(<ErAssessmentForm {...props} newSection="signoff" />)
    expect(await screen.findByText('Assessment sign-off')).toBeTruthy()
    rerender(<ErAssessmentForm {...props} newSection="setup" />)

    expect(await screen.findByDisplayValue('Rejected scope awaiting correction')).toBeTruthy()
    expect(screen.queryByText('Assessment sign-off')).toBeNull()
  })
})
