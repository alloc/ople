import { makeNason } from '@ople/nason'
import { OpleDate, OpleRef, OpleTime } from './values'
import { OpleRecord } from './Record'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const getEncoder = (
  unpackRecord: (record: [ref: OpleRef, ts: OpleTime, data: any]) => OpleRecord
) =>
  makeNason<OpleRef, OpleTime, OpleDate, OpleRecord>([
    {
      test: hasConstructor(OpleRef),
      pack: String,
      unpack: ref => OpleRef.from(ref),
    },
    {
      test: hasConstructor(OpleTime),
      pack: time => time.isoTime,
      unpack: isoTime => new OpleTime(isoTime),
    },
    {
      test: hasConstructor(OpleDate),
      pack: date => date.isoDate,
      unpack: isoDate => new OpleDate(isoDate),
    },
    {
      test: arg => arg instanceof OpleRecord,
      pack: record => [record.ref, record.toJSON()],
      unpack: unpackRecord,
    },
  ])
