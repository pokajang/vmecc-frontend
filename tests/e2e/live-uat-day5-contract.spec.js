const { expect, test } = require('@playwright/test')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '../..')

const readAuditSummary = () => {
  const output = execFileSync(process.execPath, ['scripts/audit-media-render-sites.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })
  return JSON.parse(output)
}

test.describe('Day 5 media inventory contracts', () => {
  test('classifies every production media render site', () => {
    const summary = readAuditSummary()

    expect(summary.schemaVersion).toBe(1)
    expect(summary.nativeImageElements).toBe(21)
    expect(summary.classifiedMediaRenderSites).toBe(36)
    expect(summary.mediaRenderFiles).toBe(25)
    expect(summary.renderSitesByTag).toEqual({
      AttachmentImage: 1,
      PhotoEditorGallery: 2,
      PhotoPreview: 3,
      PhotosGrid: 1,
      ReportPhotoGallery: 2,
      ReportPhotoImage: 6,
      img: 21,
    })
    expect(summary.unclassifiedRenderSites).toEqual([])
  })

  test('separates image remediation from functional document naming', () => {
    const summary = readAuditSummary()

    expect(summary.filenameMentions).toBe(374)
    expect(summary.filenameMentionFiles).toBe(89)
    expect(summary.filenamePresentationCandidates).toBe(30)
    expect(summary.filenamePresentationFiles).toBe(15)
    expect(summary.filenameCandidatesByCategory).toEqual({
      'document-functional': 25,
      'mixed-attachment-review': 5,
    })
    expect(summary.unclassifiedFilenameCandidates).toEqual([])
  })
})
