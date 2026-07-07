let inspectionRoutePromise = null

export const preloadInspectionRoute = () => {
  if (!inspectionRoutePromise) {
    inspectionRoutePromise = import('./views/inspection/InspectionPage')
  }
  return inspectionRoutePromise
}
