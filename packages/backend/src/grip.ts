import * as grip from '@fanoutio/grip'
export * from '@fanoutio/grip'

export const OPEN = 'OPEN'
export const CLOSE = 'CLOSE'
export const TEXT = 'TEXT'

export const makeTextEvent = (data: string) =>
  new grip.WebSocketEvent(TEXT, data)

export const makeControlEvent = (props: object) =>
  makeTextEvent('c:' + JSON.stringify(props))
