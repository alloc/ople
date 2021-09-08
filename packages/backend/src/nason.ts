import { makeBatchDecoder, makeNason, makeReplyEncoder } from '@ople/nason'
import { OpleDate, OpleRef, OpleTime, isOpleDocument } from 'ople-db'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const nason = makeNason<OpleRef, OpleTime, OpleDate, OpleDocument>([
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
])

export const encodeReply = makeReplyEncoder(nason)
export const decodeBatch = makeBatchDecoder(nason)
