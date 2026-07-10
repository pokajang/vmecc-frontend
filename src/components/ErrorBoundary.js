import React from 'react'
import { CButton } from '@coreui/react'
import { logError } from 'src/services/logger'
import PageState from './PageState'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    logError('[ErrorBoundary]', error, { componentStack: info?.componentStack })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (fallback) return fallback(this.state.error, this.handleReset)
      return (
        <PageState
          variant="error"
          className="my-4"
          title="Something went wrong"
          message="This page could not be displayed. Try again or refresh the page."
          action={
            <CButton color="secondary" variant="outline" size="sm" onClick={this.handleReset}>
              Try again
            </CButton>
          }
        />
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
