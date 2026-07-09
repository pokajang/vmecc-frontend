// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InspectionReviewView } from '../app/InspectionModuleSections'

afterEach(() => {
  cleanup()
})

const buildItem = (overrides = {}) => ({
  key: 'fire-extinguisher-inspection',
  inspectionType: 'Fire Extinguisher Inspection',
  title: 'Fire Extinguisher',
  status: 'ready',
  blockers: [],
  metrics: { count: 1, checkedCount: 1, defectCount: 0 },
  groups: [
    {
      zone: '1',
      mainLocation: 'Canteen',
      subLocation: 'Canteen',
      label: 'CAN-001',
      status: 'Checked',
    },
  ],
  form: {
    inspectionType: 'Fire Extinguisher Inspection',
    inspectedAt: '2026-07-06T08:00',
    zone: '1',
    mainLocation: 'Canteen',
    subLocation: 'Canteen',
    fireExtinguisherChecks: [],
    photos: [],
  },
  ...overrides,
})

describe('InspectionReviewView pending submissions', () => {
  it('submits the selected type without clearing other pending types', async () => {
    const submit = vi.fn(async (_record, options) => {
      options?.onSubmitted?.({ displayId: 'INS-1' }, _record)
    })
    const clearInspectionTypeDraft = vi.fn()
    const fireExtinguisher = buildItem({
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        inspectedAt: '2026-07-06T08:00',
        zone: '1',
        mainLocation: 'Canteen',
        subLocation: 'Canteen',
        fireExtinguisherChecks: [{ id: 'fe-1', idLocNo: 'CAN-001' }],
        photos: [],
        inspectionTypeDrafts: {
          'general inspection': {
            inspectionType: 'General Inspection',
            inspectionIssues: [{ id: 'issue-1', description: 'Should stay pending.' }],
          },
        },
      },
    })
    const general = buildItem({
      key: 'general-inspection',
      inspectionType: 'General Inspection',
      title: 'General Inspection',
      metrics: { count: 1, checkedCount: 1, defectCount: 1 },
      groups: [
        {
          zone: '2',
          mainLocation: 'Workshop',
          subLocation: 'Pump Room',
          label: 'Blocked access.',
          status: 'Recorded',
        },
      ],
      form: {
        inspectionType: 'General Inspection',
        inspectedAt: '2026-07-06T09:00',
        zone: '2',
        mainLocation: 'Workshop',
        subLocation: 'Pump Room',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        photos: [],
      },
    })

    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          inspectedAt: item.form.inspectedAt,
          location: [item.form.mainLocation, item.form.subLocation].filter(Boolean).join(' > '),
          ...item.form,
        })}
        clearInspectionTypeDraft={clearInspectionTypeDraft}
        isSubmitting={false}
        pendingSubmissionSummary={{ items: [fireExtinguisher, general] }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={submit}
        user={{ name: 'Inspector' }}
      />,
    )

    expect(screen.queryByText('Pending Submissions')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit Inspection' })).toBeNull()
    expect(screen.getByText('Fire Extinguisher')).toBeTruthy()
    expect(screen.getByText('General Inspection')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Inspection review actions' })).toBeNull()
    expect(screen.queryByText('Canteen')).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0])

    expect(screen.getByText('Fire Extinguisher Details')).toBeTruthy()
    expect(screen.getByText('Locations checked (1)')).toBeTruthy()
    expect(screen.getByText('Zone 1 > Canteen')).toBeTruthy()
    expect(screen.getByText('1/1 fire extinguisher checked')).toBeTruthy()
    expect(screen.getByText('Issues recorded (0)')).toBeTruthy()
    expect(screen.getByText('No issues recorded')).toBeTruthy()
    expect(
      screen.getByText('All checked fire extinguishers were recorded without issues.'),
    ).toBeTruthy()
    expect(screen.queryByText('CAN-001')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Submit' })[0])
    })
    expect(screen.getByText('Submit Fire Extinguisher Inspection?')).toBeTruthy()
    expect(screen.getByText(/Date:.*2026/i)).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))
    })

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: 'Fire Extinguisher Inspection',
        status: 'Submitted',
        fireExtinguisherChecks: [expect.objectContaining({ id: 'fe-1', idLocNo: 'CAN-001' })],
      }),
      expect.objectContaining({
        clearWorkingStateOnSuccess: false,
        navigateOnSuccess: false,
      }),
    )
    expect(submit.mock.calls[0][0]).toEqual(
      expect.not.objectContaining({
        inspectionTypeDrafts: expect.any(Object),
        inspection_type_drafts: expect.any(Object),
        inspectionIssues: expect.arrayContaining([
          expect.objectContaining({ description: 'Should stay pending.' }),
        ]),
      }),
    )
    expect(clearInspectionTypeDraft).toHaveBeenCalledWith('Fire Extinguisher Inspection')
    expect(screen.getByText('General Inspection')).toBeTruthy()
  })

  it('groups selected type review rows by zone, main area, and location', () => {
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              metrics: { count: 3, checkedCount: 3, defectCount: 1 },
              groups: [
                {
                  zone: '1',
                  mainLocation: 'Canteen',
                  subLocation: 'Kitchen',
                  label: 'CAN-001',
                  status: 'Checked',
                },
                {
                  zone: '1',
                  mainLocation: 'Canteen',
                  subLocation: 'Kitchen',
                  label: 'CAN-002',
                  status: 'Issue',
                  description: 'FE Physical Condition: Not Good',
                  remarks: 'Hose damaged.',
                },
                {
                  zone: '2',
                  mainLocation: 'Workshop',
                  subLocation: 'Pump Room',
                  label: 'PMP-001',
                  status: 'Checked',
                },
              ],
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    expect(screen.queryByText('Kitchen')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByText('Zone 1 > Canteen > Kitchen')).toBeTruthy()
    expect(screen.getByText('Zone 2 > Workshop > Pump Room')).toBeTruthy()
    expect(screen.getByText('2/2 fire extinguishers checked')).toBeTruthy()
    expect(screen.getByText('1/1 fire extinguisher checked')).toBeTruthy()
    expect(screen.getByText('Locations checked (2)')).toBeTruthy()
    expect(screen.getByText('Issues recorded (1)')).toBeTruthy()
    expect(screen.getByText('Zone 1')).toBeTruthy()
    expect(screen.queryByText('CAN-001')).toBeNull()
    expect(screen.getByText('CAN-002')).toBeTruthy()
    expect(screen.getByText('FE Physical Condition: Not Good - Hose damaged. - Issue')).toBeTruthy()
    expect(screen.queryByText('PMP-001')).toBeNull()
  })

  it('shows grouped inspection photos in the details drawer', () => {
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              form: {
                inspectionType: 'Fire Extinguisher Inspection',
                inspectedAt: '2026-07-06T08:00',
                zone: '1',
                mainLocation: 'Canteen',
                subLocation: 'Kitchen',
                fireExtinguisherChecks: [
                  {
                    id: 'fe-1',
                    idLocNo: 'CAN-001',
                    zone: '1',
                    mainLocation: 'Canteen',
                    subLocation: 'Kitchen',
                    physicalConditionPhotos: [
                      {
                        id: 'physical-photo-1',
                        fileName: 'physical.jpg',
                        description: 'Physical condition evidence',
                        url: 'data:image/png;base64,physical',
                      },
                    ],
                  },
                ],
                photos: [
                  {
                    id: 'general-photo-1',
                    fileName: 'general.jpg',
                    description: 'General location evidence',
                    url: 'data:image/png;base64,general',
                  },
                ],
              },
              groups: [
                {
                  zone: '1',
                  mainLocation: 'Canteen',
                  subLocation: 'Kitchen',
                  label: 'CAN-001',
                  status: 'Checked',
                },
              ],
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    const photoLink = screen.getByRole('button', { name: 'Inspection photos (2 total)' })
    expect(photoLink).toBeTruthy()
    expect(screen.queryByText('general.jpg')).toBeNull()

    fireEvent.click(photoLink)

    expect(screen.getByText('General Evidence Photos')).toBeTruthy()
    expect(screen.getByText('CAN-001 - Physical Condition Photos')).toBeTruthy()
    expect(screen.getByText('general.jpg')).toBeTruthy()
    expect(screen.getByText('General location evidence')).toBeTruthy()
    expect(screen.getByText('physical.jpg')).toBeTruthy()
    expect(screen.getByText('Physical condition evidence')).toBeTruthy()
  })

  it('renders non-fire-extinguisher issue rows in the details drawer', () => {
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              key: 'general-inspection',
              inspectionType: 'General Inspection',
              title: 'General Inspection',
              metrics: { count: 1, checkedCount: 1, defectCount: 1 },
              groups: [
                {
                  zone: '2',
                  mainLocation: 'Workshop',
                  subLocation: 'Pump Room',
                  label: 'Blocked access.',
                  status: 'Issue',
                  description: 'Blocked access.',
                  remarks: 'Barricade missing.',
                },
              ],
              form: {
                inspectionType: 'General Inspection',
                inspectedAt: '2026-07-06T09:00',
                zone: '2',
                mainLocation: 'Workshop',
                subLocation: 'Pump Room',
                inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
                photos: [],
              },
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByText('General Inspection Details')).toBeTruthy()
    expect(screen.getByText('Zone 2 > Workshop > Pump Room')).toBeTruthy()
    expect(screen.getByText('1/1 finding checked')).toBeTruthy()
    expect(screen.getByText('Issues recorded (1)')).toBeTruthy()
    expect(screen.getByText('Blocked access.')).toBeTruthy()
    expect(screen.getByText('Blocked access. - Barricade missing. - Issue')).toBeTruthy()
  })

  it('shows completed over total counts when a saved row is incomplete', () => {
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              metrics: { count: 2, checkedCount: 1, defectCount: 0 },
              blockers: [{ key: 'incomplete-items', message: '1 saved item need attention.' }],
              groups: [
                {
                  zone: '1',
                  mainLocation: 'Canteen',
                  subLocation: 'Kitchen',
                  label: 'CAN-001',
                  status: 'Checked',
                },
                {
                  zone: '1',
                  mainLocation: 'Canteen',
                  subLocation: 'Kitchen',
                  label: 'CAN-002',
                  status: 'Needs attention',
                },
              ],
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(screen.getByText('1/2 fire extinguishers checked')).toBeTruthy()
    expect(screen.getByText('CAN-002')).toBeTruthy()
  })

  it('orders checked locations by numbered zones before other labels', () => {
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              metrics: { count: 4, checkedCount: 4, defectCount: 0 },
              groups: [
                {
                  zone: '2',
                  mainLocation: 'Main Sub Station',
                  subLocation: 'Switchgear Room',
                  label: 'FE-004',
                  status: 'Checked',
                },
                {
                  zone: 'Alpha Yard',
                  mainLocation: 'Warehouse',
                  subLocation: 'Entrance',
                  label: 'FE-003',
                  status: 'Checked',
                },
                {
                  zone: '10',
                  mainLocation: 'Utility',
                  subLocation: 'Pump Room',
                  label: 'FE-002',
                  status: 'Checked',
                },
                {
                  zone: '1',
                  mainLocation: 'Manjung Hub',
                  subLocation: 'Admin',
                  label: 'FE-001',
                  status: 'Checked',
                },
              ],
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    const paths = screen
      .getAllByText(/^(Zone|Alpha Yard)/)
      .map((node) => node.textContent)
      .filter((value) => value.includes('>'))

    expect(paths).toEqual([
      'Zone 1 > Manjung Hub > Admin',
      'Zone 2 > Main Sub Station > Switchgear Room',
      'Zone 10 > Utility > Pump Room',
      'Alpha Yard > Warehouse > Entrance',
    ])
  })

  it('blocks submit for a type with blockers', () => {
    const saveDraft = vi.fn()
    const sessionReviewForm = { inspectionType: 'Fire Extinguisher Inspection' }
    const reviewWorkspace = { mode: 'new' }
    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          ...item.form,
        })}
        clearInspectionTypeDraft={vi.fn()}
        isSubmitting={false}
        pendingSubmissionSummary={{
          items: [
            buildItem({
              status: 'failed',
              blockers: [{ key: 'draft-sync-failed', message: 'Sync failed. Retry required.' }],
            }),
          ],
        }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={reviewWorkspace}
        saveDraft={saveDraft}
        sessionReviewForm={sessionReviewForm}
        submit={vi.fn()}
        user={{ name: 'Inspector' }}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry Sync' })[0])
    expect(saveDraft).toHaveBeenCalledWith(sessionReviewForm, reviewWorkspace)

    expect(screen.queryByText('Sync failed. Retry required.')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Submit' })[0].disabled).toBe(true)

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry Sync' })[0])
    expect(saveDraft).toHaveBeenCalledTimes(2)
  })

  it('allows a ready type to submit when another pending type is blocked', async () => {
    const submit = vi.fn(async (_record, options) => {
      options?.onSubmitted?.({ displayId: 'INS-GEN-1' }, _record)
    })
    const clearInspectionTypeDraft = vi.fn()
    const fireExtinguisher = buildItem({
      status: 'needs_attention',
      blockers: [
        {
          key: 'fire-extinguisher-session-sync',
          message: '1 fire extinguisher session update could not sync. Retry to continue.',
        },
      ],
    })
    const general = buildItem({
      key: 'general-inspection',
      inspectionType: 'General Inspection',
      title: 'General Inspection',
      metrics: { count: 1, checkedCount: 1, defectCount: 1 },
      groups: [
        {
          zone: '2',
          mainLocation: 'Workshop',
          subLocation: 'Pump Room',
          label: 'Blocked access.',
          status: 'Recorded',
        },
      ],
      form: {
        inspectionType: 'General Inspection',
        inspectedAt: '2026-07-06T09:00',
        zone: '2',
        mainLocation: 'Workshop',
        subLocation: 'Pump Room',
        inspectionIssues: [{ id: 'issue-1', description: 'Blocked access.' }],
        photos: [],
      },
    })

    render(
      <InspectionReviewView
        backFromReview={vi.fn()}
        buildPendingReviewRecord={(item) => ({
          id: `record:${item.key}`,
          displayId: `INS-${item.key}`,
          status: 'Draft',
          incidentType: item.inspectionType,
          inspectedAt: item.form.inspectedAt,
          location: [item.form.mainLocation, item.form.subLocation].filter(Boolean).join(' > '),
          ...item.form,
        })}
        clearInspectionTypeDraft={clearInspectionTypeDraft}
        isSubmitting={false}
        pendingSubmissionSummary={{ items: [fireExtinguisher, general] }}
        renderStatusBadge={(status) => <span>{status}</span>}
        reviewMayQueue={false}
        reviewRecord={null}
        reviewWorkspace={{ mode: 'new' }}
        saveDraft={vi.fn()}
        sessionReviewForm={{}}
        submit={submit}
        user={{ name: 'Inspector' }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Retry Sync' })).toBeTruthy()
    expect(
      screen.queryByText('1 fire extinguisher session update could not sync. Retry to continue.'),
    ).toBeNull()

    await act(async () => {
      const submitButton = screen
        .getAllByRole('button', { name: 'Submit' })
        .find((button) => !button.disabled)
      fireEvent.click(submitButton)
    })

    expect(screen.getByText('Submit General Inspection?')).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))
    })

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: 'General Inspection',
        status: 'Submitted',
      }),
      expect.objectContaining({
        clearWorkingStateOnSuccess: false,
        navigateOnSuccess: false,
      }),
    )
    expect(clearInspectionTypeDraft).toHaveBeenCalledWith('General Inspection')
  })
})
