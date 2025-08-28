// Shared constants, utilities and types
export * from '../plugins/base/constants.js'
export * from '../plugins/base/utils.js'

// Re-export core types
export type {
  VueMcpOptions,
  VueAppBridge,
  VueMcpContext,
  ComponentSelector,
  ComponentNode,
  ComponentState,
  StatePatch,
  RouterInfo,
  PiniaState
} from '../server/types.js'