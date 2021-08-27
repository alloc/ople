import { is } from '@alloc/is'
import { dequal } from 'dequal'
import { makeBatchDecoder, makeNason, makeReplyEncoder } from '@ople/nason'
import {
  OpleDate,
  OpleDocument as OpleRecord,
  OpleRef,
  OpleTime,
} from 'ople-db'

const recordKeys = ['ref', 'data', 'ts']

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const nason = makeNason<OpleRef, OpleTime, OpleDate, OpleRecord>([
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
    test: (arg: any) =>
      is.plainObject(arg) && dequal(Object.keys(arg), recordKeys),
    pack: record => [record.ref, record.ts, record.data],
  },
])

export const encodeReply = makeReplyEncoder(nason)
export const decodeBatch = makeBatchDecoder(nason)
