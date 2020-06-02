import { o } from 'wana'
import { Ople } from './Ople'
import { withOple } from './global'
import { OpleCreateFn, OpleObject } from './types'

export function createOple<
  State extends object = any,
  Events extends object = any
>(create: OpleCreateFn<State, Events>) {
  const self: OpleObject<State, Events> = o(new Ople()) as any
  withOple(self, () => {
    create(self, self.set.bind(self))
  })
  return self
}
