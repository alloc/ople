import { Encoder, use } from 'nason/src/index'
import arrayType from 'nason/src/types/array'
import stringType from 'nason/src/types/string'
import { OpleDate, OpleTime, OpleRef } from './values'
import { Config } from './types'

export function makeOpleEncoder<Record>({
  isRecord,
  packRecord,
  unpackRecord,
}: Config<Record>) {
  // Since the client and backend use different data structures
  // to represent Records in-memory, the data marshalling cannot
  // be implemented in an isomorphic context.
  const recordType: Encoder<any> = {
    test: isRecord,
    encode(record, encode) {
      const packed = packRecord(record)
      const packedType: Encoder<any> = Array.isArray(packed)
        ? arrayType
        : refType

      recordType.encode = record =>
        packedType.encode(packRecord(record), encode)

      return packedType.encode(packed, encode)
    },
    decode(packed, decode) {
      const packedType: Encoder<any> = Array.isArray(packed)
        ? arrayType
        : refType

      recordType.decode = packed =>
        unpackRecord(packedType.decode(packed, decode))

      return recordType.decode(packed, decode)
    },
  }

  return use([
    [0, refType],
    [1, timeType],
    [2, dateType],
    [3, recordType],
  ])
}

const hasConstructor = (ctr: Function) => (val: any) =>
  ctr === (val && val.constructor)

const refType: Encoder<OpleRef> = {
  test: hasConstructor(OpleRef),
  encode: ref => stringType.encode(ref.toString()),
  decode: data => OpleRef.from(stringType.decode(data)),
}

const timeType: Encoder<OpleTime> = {
  test: hasConstructor(OpleTime),
  encode: time => stringType.encode(time.isoTime),
  decode: bytes => new OpleTime(stringType.decode(bytes)),
}

const dateType: Encoder<OpleDate> = {
  test: hasConstructor(OpleDate),
  encode: date => stringType.encode(date.isoDate),
  decode: bytes => new OpleDate(stringType.decode(bytes)),
}
