import { uid } from 'uid'
import { OpleJSON } from '../json'

export function wrapCallback(cb: Function) {
  return new OpleCallback(cb)
}

export class OpleCallback {
  readonly id: string
  readonly invoke: Function
  constructor(cb: Function) {
    this.id = uid()
    this.invoke = (...args: string[]) =>
      OpleJSON.stringify(cb(...args.map(OpleJSON.parse)))
  }
}
