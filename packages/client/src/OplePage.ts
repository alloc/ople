import { o } from 'wana'
import { OpleRef, OpleTime } from './values'

export type OpleCursor = OpleRef

export interface OplePage<T = any> {
  readonly data: T[]
  readonly before?: OpleCursor
  readonly after?: OpleCursor
}

export interface OplePager<T = any> {
  (opts?: OplePager.Options): Promise<OplePage<T>>
}

export namespace OplePager {
  export interface Options {
    ts?: number | OpleTime
    before?: OpleCursor
    after?: OpleCursor
    size?: number
  }
}

export class OplePageSet<T = any> extends Array<T> {
  pages: OplePage<T>[]

  protected _nextPromises = new Map<OplePage, PromiseLike<OplePage>>()
  protected _loadPage: 

  constructor(
    page: OplePage<T>,
    loadPage: (opts: OplePager.Options) => PromiseLike<OplePage>
  ) {
    super(...page.data)
    this.pages = o([page])
    this._loadPage = loadPage
    return o(this)
  }

  async nextPage() {
    const lastPage = this.pages[this.pages.length - 1]
    if (lastPage.after) {
      let promise = this._nextPromises.get(lastPage)
      if (!promise) {
        promise = this._loadPage({
          after: lastPage.after,
        }).then(page => {
          this.push(...page.data)
          this.pages.push(page)
          this._nextPromises.delete(lastPage)
          return page
        })
        this._nextPromises.set(lastPage, promise)
      }
      return promise
    }
    return null
  }
}
