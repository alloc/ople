export { auto } from './auto'
export { watch } from './watch'
export { Ople, setup } from './Ople'
export { toDoc, toRef, trackChanges } from './OpleDocument'
export { OpleDate, OpleTime } from './values'
export { OplePages } from './OplePage'

// Advanced use
export * from './OpleBackend'
export * from './OpleContext'
export { onceCreated } from './OpleDocument'
export { makeCreator } from './creator'
export { makeSignal } from './signals'
export { attachAuto } from './auto'
export { OpleProtocol } from '@ople/agent'

// Observables
export * from 'wana'

// Types
export type { OpleRef } from './OpleRef'
export type { OpleDocument, OpleRefLike } from './OpleDocument'
export type { OpleSignal, OpleListener } from './signals'
export type { OplePage, OplePager } from './OplePage'
