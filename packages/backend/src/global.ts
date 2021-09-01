import type { OpleRef } from 'ople-db'
import type { Caller, UserRef } from './callees'

interface ExposedFunctions {
  /**
   * Run a test before every call of any of the associated functions,
   * and pretend like the function doesn't exist if the test fails.
   *
   * Most of the time, you'll be checking `caller.meta` or reading
   * something from the database to verify the caller.
   */
  authorize(test: () => boolean | Promise<boolean>): void
}

declare global {
  /**
   * Expose a backend function to the client.
   */
  function exposeFunction(callee: Function): ExposedFunctions

  /**
   * Expose one or more backend functions to the client.
   */
  function exposeFunctions(callees: Record<string, Function>): ExposedFunctions

  /**
   * The function caller.
   */
  const caller: Caller

  /**
   * Send a signal to every connection.
   */
  function emit(global: NodeJS.Global): Record<string, Function>

  /**
   * Send a signal to the caller.
   */
  function emit(caller: Caller): Record<string, Function>

  /**
   * Send a signal to every connection of the given user.
   */
  function emit(user: UserRef): Record<string, Function>

  /**
   * Send a signal to every subscriber of the given ref.
   */
  function emit(ref: OpleRef): Record<string, Function>

  /**
   * Send a signal to a private channel.
   */
  function emit(channel: string): Record<string, Function>

  /**
   * Subscribe the caller to a private channel.
   */
  function subscribe(channel: string): void

  /**
   * Unsubscribe the caller from a private channel.
   *
   * NB: Disconnection results in automatic unsubscribe.
   */
  function unsubscribe(channel: string): void

  /**
   * The place where you keep all that precious data.
   */
  const db: typeof import('ople-db').db

  /**
   * Read from the database. All interaction with the global
   * `db` object must be done from within a `read` or `write`
   * callback.
   */
  const read: typeof import('ople-db').read

  /**
   * Write to the database (and read if necessary).
   *
   * Calls to `write` block each other, while calls to `read`
   * are executed in parallel and don't wait for `write` calls.
   *
   * The `abort` function is called automatically if your callback
   * throws an error. It predictably reverts any mutations made by
   * the callback before they can ever be accessed.
   */
  const write: typeof import('ople-db').write
}
