import { Methods } from './handler'
import { Record } from './types'

export { serve }

declare function serve(config?: {
  /** The port to serve HTTP requests on. */
  port: number
  /** The database config. */
  database: {
    /** The root database. */
    root: string
    /** The database secret. */
    secret: string
    /** The cluster host. Defaults to `localhost:8773` or FaunaDB production server. */
    host?: string
  }
}): Server

export interface Server<Events extends object = any> {
  /** Add collections to the database. */
  collection(config: CollectionConfig): void
  /** Add methods to the server. */
  extend(methods: Methods): void
  /** Send an event to interested clients. */
  emit<P extends keyof Events>(
    key: P,
    ...args: EventArgs<Events, Extract<P, string>>
  ): void
  emit<Events extends object, P extends keyof Events>(
    target: Record<Events>,
    key: P,
    ...args: EventArgs<Events, Extract<P, string>>
  ): void
}

type Data<T> = {[P in keyof T]: Exclude<T[P], Function>}

interface CollectionConfig<T extends object = any, U extends object = any> {
  type: new (...args: any[]) => T
  data?: U
  access?: {
    read?(ref: Ref<T>): void
    write?(oldData: Data<T>, newData: Data<T>): void
    create?(data: Data<T>): void
    delete?(ref: Ref): void
  }
}
