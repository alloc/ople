import { Encoder, use } from 'nason/src/index'
import arrayType from 'nason/src/types/array'
import stringType from 'nason/src/types/string'
import { FaunaDate, FaunaTime, Ref } from 'fauna-lite'
import { Config } from './types'

export function makeFaunaEncoder<Record>({
  Record,
  packRecord,
  unpackRecord,
}: Config<Record>) {
  // Since the client and backend use different data structures
  // to represent Records in-memory, the data marshalling cannot
  // be implemented in an isomorphic context.
  const recordType: Encoder<any> = {
    test: hasConstructor(Record),
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

const refType: Encoder<Ref> = {
  test: hasConstructor(Ref),
  encode: ref => stringType.encode(ref.toString()),
  decode: data => Ref.from(stringType.decode(data)),
}

const timeType: Encoder<FaunaTime> = {
  test: hasConstructor(FaunaTime),
  encode: time => stringType.encode(time.isoTime),
  decode: bytes => new FaunaTime(stringType.decode(bytes)),
}

const dateType: Encoder<FaunaDate> = {
  test: hasConstructor(FaunaDate),
  encode: date => stringType.encode(date.isoDate),
  decode: bytes => new FaunaDate(stringType.decode(bytes)),
}
