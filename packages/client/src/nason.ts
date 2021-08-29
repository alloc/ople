import { makeNason } from '@ople/nason'
import { OpleCollection, OpleDate, OpleRef, OpleTime } from './values'
import { initHandle, OpleRefHandle } from './OpleRef'

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

export const getEncoder = (getCollection: (name: string) => OpleCollection) =>
  makeNason<OpleRef, OpleTime, OpleDate, OpleRefHandle>([
    {
      test: val => val instanceof OpleRef,
      pack: String,
      unpack(encodedRef) {
        const [scope, id] = encodedRef.split('/')
        const collection = getCollection(scope)
        return id ? new OpleRef(id, collection) : collection
      },
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
      unpack: ([ref, ts, data]) => initHandle(data, ref, ts),
    },
  ])
