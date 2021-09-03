import { OpleRef } from 'ople-db'
import { ServerContext } from './context'
import { User } from './types'

export interface Callee {
  (caller: Caller, ...args: any[]): any
  authorize?(caller: Caller): any
}

/** Backend callees which are called by the client. */
export const callees: Record<string, Callee> = {}

export type CallerMeta = Record<string, string | number | boolean>

export class Caller {
  private _user?: OpleRef<User>
  /** The caller identity. */
  readonly id: string
  /** Caller metadata set by past calls. */
  readonly meta: CallerMeta
  /** The user identity. Set to empty string when logged out. */
  uid: string

  constructor(
    connectionId: string,
    { user = '', ...meta }: CallerMeta,
    /** @internal */
    readonly context: ServerContext
  ) {
    this.id = connectionId
    this.uid = user as string
    this.meta = meta
  }

  /** Exists when `this.uid` does. */
  get user() {
    return !this.uid
      ? null
      : this.uid === this._user?.id
      ? this._user
      : (this._user = new OpleRef(
          this.uid,
          new OpleRef('users', OpleRef.Native.collections)
        ))
  }
}
