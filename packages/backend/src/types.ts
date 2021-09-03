import { OpleRef } from 'ople-db'

export {
  OpleRef,
  OpleTime,
  OpleDate,
  OpleDocuments,
  OpleCollections,
} from 'ople-db'

/**
 * The document type of a proverbial user
 *
 * ---
 * Use *interface merging* to define more properties:
 *
 *     declare module "@ople/backend/global" {
 *       export interface User {
 *         name: string
 *       }
 *     }
 */
export interface User {}

/**
 * Every signal supported by the client
 *
 * ---
 * Use *interface merging* to provide more signals:
 *
 *     declare module "@ople/backend/global" {
 *       export interface Signals {
 *         onHelloWorld(): void
 *       }
 *     }
 */
export interface Signals {}

/**
 * The signal types for a specific `OpleRef`
 */
export type RefSignals<
  T extends object
> = PickRefSignals<T> extends infer Signals
  ? Omit<Signals, NeverKeys<Signals>>
  : never

/**
 * Reduce the `Signals` type to only contain signals that
 * accept an `OpleRef<T>` as their first argument.
 */
type PickRefSignals<T extends object> = {
  [P in keyof Signals]: Overloads<Signals[P]> extends infer S
    ? S extends any
      ? ((ref: OpleRef<T>, ...args: any[]) => void) extends S
        ? S extends (ref: OpleRef<T>, ...args: infer Args) => void
          ? (...args: Args) => void
          : never
        : never
      : never
    : never
}

/**
 * A hacky way to convert a group of call signatures (aka overloads)
 * into a union of function types.
 */
type Overloads<T> = T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
  (...args: infer A3): infer R3
}
  ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3)
  : T extends {
      (...args: infer A1): infer R1
      (...args: infer A2): infer R2
    }
  ? ((...args: A1) => R1) | ((...args: A2) => R2)
  : T extends (...args: infer A1) => infer R1
  ? T
  : never

/** Find which object keys have a `never` type */
type NeverKeys<T> = keyof T extends infer P
  ? P extends keyof T
    ? T[P] extends never
      ? P
      : never
    : never
  : never
