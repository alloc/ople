import { makeNason } from '@ople/nason'
import { OpleDate, OpleTime } from './values'
import { OpleDocument } from './OpleDocument'
import { OpleRef } from './OpleRef'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

type PackedRef = string
type PackedDocument = [ref: OpleRef, ts: OpleTime, data: object]

export const getEncoder = (
  unpackRef: (ref: PackedRef) => OpleRef,
  unpackDocument: (doc: PackedDocument) => object
) =>
  makeNason<OpleRef, OpleTime, OpleDate, object>([
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
      unpack: unpackDocument,
    },
  ])
