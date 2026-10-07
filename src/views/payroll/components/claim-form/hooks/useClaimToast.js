import useWorkflowFeedback from 'src/components/report-workflow/useWorkflowFeedback'

const useClaimToast = () => {
  const { feedback, clearFeedback, pushFeedback } = useWorkflowFeedback()

  return {
    feedback,
    clearFeedback,
    pushToast: pushFeedback,
  }
}

export default useClaimToast
