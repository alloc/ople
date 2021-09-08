import { makeNason } from '@ople/nason'
import { OpleDate, OpleTime } from './values'
import { initDocument, OpleDocument } from './OpleDocument'
import { OpleRef } from './OpleRef'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const getEncoder = (unpackRef: (packedRef: string) => OpleRef) =>
  makeNason<OpleRef, OpleTime, OpleDate, OpleDocument>([
    {
      test: (val: any) =>
        Boolean(val) &&
        (val.constructor == OpleDocument || val instanceof OpleRef),
      pack: String,
      unpack: unpackRef,
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
      unpack: ([ref, ts, data]) => initDocument(data, ref, ts),
    },
  ])
