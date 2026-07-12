import { hasPermission } from './authz'
import { isModuleActivationHydrated, isModuleEnabled } from './modules'

export const canLoadMessageThreads = (authUser, moduleActivation) =>
  isModuleActivationHydrated(moduleActivation) &&
  isModuleEnabled(moduleActivation, 'messages') &&
  hasPermission(authUser, 'self.messages')
