import { makeBatchDecoder, makeNason, makeReplyEncoder } from '@ople/nason'
import { OpleDate, OpleRef, OpleTime, isOpleDocument } from 'ople-db'
import { OplePager } from './pager'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const nason = makeNason<
  OpleRef,
  OpleTime,
  OpleDate,
  OpleDocument,
  OplePager
>([
  {
    test: hasConstructor(OpleRef),
    pack: String,
    unpack: ref => OpleRef.from(ref),
  },
  {
    test: hasConstructor(OpleTime),
    pack: time => time.toString(),
    unpack: isoTime => new OpleTime(isoTime),
  },
  {
    test: hasConstructor(OpleDate),
    pack: date => date.toString(),
    unpack: isoDate => new OpleDate(isoDate),
  },
  {
    test: isOpleDocument,
    pack: record => [record.ref, record.ts, record.data],
  },
  {
    test: hasConstructor(OplePager),
    pack: pager => Object.values(pager) as any,
  },
])

export const encodeReply = makeReplyEncoder(nason)
export const decodeBatch = makeBatchDecoder(nason)
