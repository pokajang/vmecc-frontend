import { createInspectionIdentity, dedupePhotos } from '../utils/inspectionSharedUtils'
import {
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
} from '../../form/inspectionFormHelpers'

const normalizeFinding = (finding) => {
  const confirmedType = String(finding?.confirmedType || finding?.type || '').trim()
  const confirmedLocation = String(finding?.confirmedLocation || finding?.location || '').trim()
  const selectedDescription = String(
    finding?.selectedDescription || finding?.description || '',
  ).trim()
  const photoId = String(finding?.photo?.id || finding?.photoId || '').trim()

  return {
    ...finding,
    confirmedType,
    confirmedLocation,
    selectedDescription,
    type: confirmedType,
    location: confirmedLocation,
    description: selectedDescription,
    photoId,
  }
}

export const buildInspectionPayloadSnapshot = ({
  form,
  dominantType,
  dominantLocation,
  finalDescription,
}) => {
  const findings = Array.isArray(form?.findings) ? form.findings : []
  const normalizedFindings = findings.map(normalizeFinding)
  const photos = dedupePhotos(normalizedFindings.map((finding) => finding?.photo))

  return {
    ...(form && typeof form === 'object' ? form : {}),
    incidentType: String(dominantType || '').trim(),
    location: String(dominantLocation || '').trim(),
    selectedLocation: String(form?.selectedLocation || dominantLocation || '').trim(),
    description:
      String(finalDescription || '').trim() ||
      String(normalizedFindings[0]?.selectedDescription || '').trim(),
    photos,
    findings: normalizedFindings,
  }
}

export const buildInspectionRecord = ({
  form,
  dominantType,
  dominantLocation,
  finalDescription,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const { id, displayId } = createInspectionIdentity(reportTypeIdPrefix, nowIso, sequence)
  const payloadSnapshot = buildInspectionPayloadSnapshot({
    form,
    dominantType,
    dominantLocation,
    finalDescription,
  })
  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'inspection',
    status: 'Submitted',
    incidentType: payloadSnapshot.incidentType,
    location: payloadSnapshot.location,
    description: payloadSnapshot.description,
    photos: payloadSnapshot.photos,
    inspectionIssues: payloadSnapshot.inspectionIssues,
    issues: payloadSnapshot.inspectionIssues,
    findings: payloadSnapshot.findings,
    inspectedAt: String(payloadSnapshot.inspectedAt || '').trim(),
    submittedAt: nowIso,
    submittedBy: user?.name || user?.email || '',
    submittedByRole: getInspectionSessionActorRole(user),
    submittedByRoleCode: getInspectionSessionActorRoleCode(user),
    inspectionActor: {
      userId: user?.id ?? null,
      name: user?.name || user?.email || '',
      email: user?.email || '',
      role: getInspectionSessionActorRole(user),
      roleCode: getInspectionSessionActorRoleCode(user),
    },
  }
}
