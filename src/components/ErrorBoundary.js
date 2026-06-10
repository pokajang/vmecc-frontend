import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { logError } from 'src/services/logger'

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
        <div className="p-4">
          <CAlert color="danger">
            <strong>Something went wrong.</strong> Please try refreshing the page.
            {this.state.error?.message && (
              <div className="mt-1 small text-muted">{this.state.error.message}</div>
            )}
          </CAlert>
          <CButton color="secondary" size="sm" onClick={this.handleReset}>
            Try again
          </CButton>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
