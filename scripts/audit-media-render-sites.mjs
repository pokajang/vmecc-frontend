import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'src')
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const mediaTags = new Set([
  'img',
  'CImage',
  'ReportPhotoGallery',
  'PhotoEditorGallery',
  'PhotoPreview',
  'ReportPhotoImage',
  'PhotosGrid',
  'AttachmentImage',
])

const renderFamilies = {
  'static-brand': new Set([
    'src/components/AppSidebar.js',
    'src/views/pages/forgot-password/ForgotPassword.js',
    'src/views/pages/login/Login.js',
    'src/views/pages/reset-password/ResetPassword.js',
  ]),
  'avatar-or-identity': new Set([
    'src/components/GroupedTableHeader.js',
    'src/views/overtime/components/GroupedHeaderLabels.js',
    'src/views/profile/AccountSection.js',
    'src/views/roster/RosterStat.js',
    'src/views/staff/salary-claims-management/components/SalaryAssignmentFormSections.js',
    'src/views/team/TeamView.js',
    'src/views/team/components/EditTeamModal.js',
    'src/views/team/components/TeamCard.js',
  ]),
  'chat-image': new Set(['src/components/messages/ChatThread.js']),
  'shared-media-foundation': new Set([
    'src/components/report-workflow/ReportViewComponents.js',
    'src/components/media/EvidenceImage.js',
  ]),
  'read-only-evidence': new Set([
    'src/components/report-workflow/ReportPhotoGallery.js',
    'src/views/inspection/records/FireExtinguisherManagementPanel.js',
    'src/views/inspection/records/InspectionReviewDashboard.js',
    'src/views/inspection/ui/InspectionAiConfirmPanel.js',
    'src/views/report/components/ReportDetailSection.js',
    'src/views/report/components/ReportReviewSection.js',
  ]),
  'editable-photo-collection': new Set([
    'src/components/report-workflow/PhotoEditorGallery.js',
    'src/views/inspection/form/components/InspectionDisplayShared.js',
    'src/views/report/shared/emergency-report/ReportPhotoSection.js',
  ]),
  'mixed-attachment-preview': new Set([
    'src/views/payroll/components/claim-form/AttachmentPreviewModal.js',
    'src/views/staff/salary-claims-management/components/AttachmentPreviewModal.js',
  ]),
}

const filenamePresentationCategories = {
  'image-remediation-candidate': new Set([
    'src/components/messages/ChatThread.js',
    'src/components/report-workflow/PhotoEditorGallery.js',
    'src/components/report-workflow/ReportPhotoGallery.js',
    'src/components/report-workflow/ReportViewComponents.js',
    'src/services/api/reportMediaApi.js',
    'src/views/inspection/form/components/InspectionDisplayShared.js',
    'src/views/inspection/form/components/InspectionPhotoUploadQueueStatus.js',
    'src/views/inspection/form/inspectionPhotoUtils.js',
    'src/views/inspection/records/InspectionReviewDashboard.js',
    'src/views/inspection/ui/InspectionAiConfirmPanel.js',
    'src/views/report/shared/emergency-report/ReportPhotoSection.js',
  ]),
  'document-functional': new Set([
    'src/components/ai-helper/KnowledgeListView.js',
    'src/components/ai-helper/KnowledgeReaderModal.js',
    'src/views/admin/ai-helper-knowledge/AiHelperKnowledgeReviewModal.js',
    'src/views/leave/components/LeaveSubmitConfirmModal.js',
    'src/views/overtime/components/OvertimeDetailSection.js',
    'src/views/payroll/components/SalaryClaimReadonlyView.js',
    'src/views/payroll/components/claim-form/AttachmentPreviewModal.js',
    'src/views/payroll/components/claim-form/ClaimSubmissionSavedItemsCard.js',
    'src/views/payroll/components/claim-form/ClaimSubmitModal.js',
    'src/views/payroll/components/claim-form/SalaryPayoutCard.js',
    'src/views/staff/salary-claims-management/components/AttachmentPreviewModal.js',
    'src/views/staff/salary-claims-management/components/ClaimDetailView.js',
  ]),
  'mixed-attachment-review': new Set([
    'src/views/leave/hooks/leave-actions/useLeaveRecordActions.js',
    'src/views/leave/hooks/useAttachment.js',
    'src/views/leave/hooks/useLeaveBootEffects.js',
  ]),
}

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return []
      return walk(absolute)
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [absolute] : []
  })

const relativePath = (absolute) => path.relative(projectRoot, absolute).replaceAll('\\', '/')

const categoryFor = (file, categories) =>
  Object.entries(categories).find(([, files]) => files.has(file))?.[0] || ''

const files = walk(sourceRoot)
const renderSites = []
const filenameMentions = []
const filenamePresentationCandidates = []
const filenamePattern =
  /\b(fileName|filename|originalName|original_name|attachmentName|source_filename)\b/g
const presentationPattern =
  /<|alt=|title=|aria-label|\bmessage\s*:|\bdetail\s*:|pushToast|setFallback|reportPhotoFailureMessage/

for (const absolute of files) {
  const file = relativePath(absolute)
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      const tagPattern = /<([A-Za-z][A-Za-z0-9]*)\b/g
      for (const match of line.matchAll(tagPattern)) {
        if (!mediaTags.has(match[1])) continue
        renderSites.push({
          file,
          line: index + 1,
          tag: match[1],
          family: categoryFor(file, renderFamilies),
        })
      }
    }

    const mentions = [...line.matchAll(filenamePattern)]
    if (mentions.length === 0) return
    filenameMentions.push({ file, line: index + 1, count: mentions.length })
    if (presentationPattern.test(line)) {
      filenamePresentationCandidates.push({
        file,
        line: index + 1,
        category: categoryFor(file, filenamePresentationCategories),
      })
    }
  })
}

const unclassifiedRenderSites = renderSites.filter((site) => !site.family)
const unclassifiedFilenameCandidates = filenamePresentationCandidates.filter(
  (candidate) => !candidate.category,
)

const groupCount = (rows, key) =>
  Object.fromEntries(
    [...new Set(rows.map((row) => row[key]))]
      .sort()
      .map((value) => [value, rows.filter((row) => row[key] === value).length]),
  )

const summary = {
  schemaVersion: 1,
  productionSourceFiles: files.length,
  nativeImageElements: renderSites.filter((site) => site.tag === 'img').length,
  classifiedMediaRenderSites: renderSites.length,
  mediaRenderFiles: new Set(renderSites.map((site) => site.file)).size,
  renderSitesByTag: groupCount(renderSites, 'tag'),
  renderSitesByFamily: groupCount(renderSites, 'family'),
  filenameMentions: filenameMentions.reduce((sum, row) => sum + row.count, 0),
  filenameMentionFiles: new Set(filenameMentions.map((row) => row.file)).size,
  filenamePresentationCandidates: filenamePresentationCandidates.length,
  filenamePresentationFiles: new Set(filenamePresentationCandidates.map((row) => row.file)).size,
  filenameCandidatesByCategory: groupCount(filenamePresentationCandidates, 'category'),
  unclassifiedRenderSites,
  unclassifiedFilenameCandidates,
}

if (process.argv.includes('--details')) {
  summary.filenamePresentationCandidateDetails = filenamePresentationCandidates
}

console.log(JSON.stringify(summary, null, 2))

if (unclassifiedRenderSites.length || unclassifiedFilenameCandidates.length) {
  process.exitCode = 1
}
