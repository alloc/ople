import { uid } from 'uid'

export function wrapCallback(cb: Function) {
  return new OpleCallback(cb)
}

export class OpleCallback {
  readonly id: string
  constructor(readonly invoke: Function) {
    this.id = uid()
  }
}
