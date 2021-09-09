import { o } from 'wana'
import { OpleRef } from './OpleRef'
import { makeSignal } from './signals'
import { OpleTime } from './values'

export type OpleCursor = OpleRef

export interface OplePage<T = any> {
  readonly data: T[]
  readonly before?: OpleCursor
  readonly after?: OpleCursor
}

export namespace OplePage {
  export interface Options {
    ts?: number | OpleTime
    before?: OpleCursor
    after?: OpleCursor
    size?: number
  }
}

export interface OplePager<T = any, Args extends any[] = []> {
  (...args: [...Args, OplePage.Options?]): Promise<OplePage<T>>
}

export namespace OplePages {
  export interface Options<T = any> extends OplePage.Options {
    /**
     * Populate the first page immediately with local data.
     *
     * To skip auto-loading the first page, set this to an empty array.
     */
    data?: T[]
  }
}

export class OplePages<T = any, Args extends any[] = any> extends Array<T> {
  defaultPageSize?: number
  pages: OplePage<T>[]

  readonly onLoad = makeSignal<T>()
  readonly onPage = makeSignal<OplePage<T>>()

  protected _args: Args
  protected _nextPromise?: Promise<OplePage<T>>
  protected _ts?: number | OpleTime

  constructor(
    protected loadPage: OplePager<T, Args>,
    ...args: [...Args, OplePages.Options?]
  ) {
    super()

    const { data, ...pageOptions }: OplePages.Options =
      args.length && isPagerOpts(args[args.length - 1]) ? args.pop()! : {}

    this.defaultPageSize = pageOptions.size
    this.pages = o(
      data?.length
        ? [{ data, before: pageOptions.before, after: pageOptions.after }]
        : []
    )

    this._ts = pageOptions.ts
    this._args = args as any

    if (!data) {
      this._nextPage(pageOptions)
    }

    return o(this)
  }

  unshift(...items: T[]) {
    const length = super.unshift(...items)
    // @ts-ignore
    items.forEach(this.onLoad.emit)
    return length
  }

  async nextPage(pageSize = this.defaultPageSize) {
    const lastPage = this.pages[this.pages.length - 1]
    return lastPage.after
      ? this._nextPromise ||
          this._nextPage({
            after: lastPage.after,
            size: pageSize,
            ts: this._ts,
          })
      : null
  }

  protected _nextPage(pageOptions: OplePage.Options | undefined) {
    return (this._nextPromise = this.loadPage(...this._args, pageOptions).then(
      page => {
        this.push(...page.data)
        this.pages.push(page)
        this.onPage.emit(page)
        if (this.onLoad.size) {
          page.data.forEach(this.onLoad.emit as any)
        }
        this._nextPromise = undefined
        return page
      }
    ))
  }
}

const pagerOptionKeys = ['size', 'ts', 'before', 'after']
const isPagerOpts = (obj: any): obj is OplePage.Options => {
  if (!obj || obj.constructor !== Object) {
    return false
  }
  const keys = Object.keys(obj)
  return keys.length > 0 && keys.every(key => pagerOptionKeys.includes(key))
}
