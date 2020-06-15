import { o } from 'wana'
import { Ople } from './Ople'
import { withOple } from './global'
import { OpleCreateFn, OpleObject } from './types'
import { UnknownProps } from 'types'

export function createOple<
  State extends object = UnknownProps,
  Events extends object = any
>(create: OpleCreateFn<State, Events>) {
  const self: OpleObject<State, Events> = o(new Ople()) as any
  const bindSelf = <T extends Function>(fn: T): T => fn.bind(self)
  withOple(self, create, [self, bindSelf(self.set), bindSelf(self.emit)])
  return self
}
