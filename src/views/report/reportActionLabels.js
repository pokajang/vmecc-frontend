export const REPORT_ACTION_LABELS = {
  CONTINUE: 'Continue',
  SAVE_DRAFT: 'Save Draft',
  SAVE_UPDATE_DRAFT: 'Save Update Draft',
  SUBMIT_REPORT: 'Submit Report',
  UPDATE_REPORT: 'Update Report',
  REVIEW_REPORT: 'Review report',
  REVIEW_CHANGES: 'Review changes',
  REVIEW_AND_SUBMIT: 'Review & Submit',
  REVIEW_AND_UPDATE: 'Review & Update',
  CONTINUE_TO_REVIEW: 'Continue to Review',
  CONTINUE_TO_REVIEW_UPDATES: 'Continue to Review Updates',
}

export const getContinueToReviewLabel = (isUpdateMode) =>
  isUpdateMode
    ? REPORT_ACTION_LABELS.CONTINUE_TO_REVIEW_UPDATES
    : REPORT_ACTION_LABELS.CONTINUE_TO_REVIEW

export const getReviewLabel = (isUpdateMode) =>
  isUpdateMode ? REPORT_ACTION_LABELS.REVIEW_CHANGES : REPORT_ACTION_LABELS.REVIEW_REPORT

export const getSubmitReviewLabel = (isUpdateMode) =>
  isUpdateMode ? REPORT_ACTION_LABELS.REVIEW_AND_UPDATE : REPORT_ACTION_LABELS.REVIEW_AND_SUBMIT
