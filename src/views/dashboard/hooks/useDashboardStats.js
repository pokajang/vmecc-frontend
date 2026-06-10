import { dashboardMocks } from '../mocks/dashboard-mocks'

// Returns { stats, loading, error }.
// To swap a module to a real API call, replace the matching key below with a fetch result.
// Example when payroll backend is ready:
//   const [payroll, setPayroll] = useState(null)
//   useEffect(() => { apiClient.get('/stats/payroll-claims').then(r => setPayroll(r.data)) }, [])
//   return { stats: { ...dashboardMocks, payroll }, loading: !payroll, error: null }

const useDashboardStats = () => {
  return {
    stats: dashboardMocks,
    loading: false,
    error: null,
  }
}

export default useDashboardStats
