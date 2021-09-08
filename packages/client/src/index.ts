export { auto } from './auto'
export { Ople, setup } from './Ople'
export { toDoc, toRef } from './OpleDocument'
export { OpleDate, OpleTime } from './values'
export { OplePages } from './OplePage'

// Advanced use
export * from './OpleBackend'
export { setEffect } from './OpleContext'
export { makeCreator } from './creator'
export { makeSignal } from './signals'
export { attachAuto } from './auto'
export { OpleProtocol } from '@ople/agent'

// Observables
export * from 'wana'

// Types
export type { OpleRef } from './OpleRef'
export type { OpleDocument, OpleRefLike } from './OpleDocument'
export type { OpleEffect } from './OpleContext'
export type { OpleListener } from './signals'
export type { OplePage, OplePager } from './OplePage'
