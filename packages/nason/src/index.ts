import { Encoder, use } from 'nason/src/index'
import arrayType from 'nason/src/types/array'
import objectType from 'nason/src/types/object'
import stringType from 'nason/src/types/string'
import { Nason, Packer, RecordPacker } from './types'

export const makeNason = <
  OpleRef extends object,
  OpleTime extends object,
  OpleDate extends object,
  OpleRecord extends object
>(
  types: [
    OpleRef: Packer<OpleRef, string>,
    OpleTime: Packer<OpleTime, string>,
    OpleDate: Packer<OpleDate, string>,
    OpleRecord: RecordPacker<OpleRecord, OpleRef, OpleTime>
  ]
): Nason =>
  use([
    [0, encodeString(types[0])],
    [1, encodeString(types[1])],
    [2, encodeString(types[2])],
    [3, encodeRecord(types[3])],
  ])

const encodeString = <T>({
  test,
  pack,
  unpack,
}: Packer<T, string>): Encoder<T> => ({
  test,
  encode: value => stringType.encode(pack(value)),
  decode: bytes => unpack(stringType.decode(bytes)),
})

const encodeRecord = <T extends object>({
  test,
  pack,
  unpack,
}: RecordPacker<T>): Encoder<T> => ({
  test,
  encode(record, encode) {
    if (!pack) {
      throw Error('Record packing not supported')
    }
    const packed = pack(record)
    const packedType: Encoder<any> = Array.isArray(packed)
      ? arrayType
      : objectType
    this.encode = record => packedType.encode(pack(record), encode)
    return packedType.encode(packed, encode)
  },
  decode(bytes, decode) {
    if (!unpack) {
      throw Error('Record unpacking not supported')
    }
    const isArray = bytes[0] === 5
    const packedType: Encoder<any> = isArray ? arrayType : objectType
    this.decode = bytes => unpack(packedType.decode(bytes, decode))
    return this.decode(bytes, decode)
  },
})

export * from './batch'
export * from './reply'
export * from './types'
