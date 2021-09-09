import { Encoder, use } from 'nason/src/index'
import arrayType from 'nason/src/types/array'
import stringType from 'nason/src/types/string'
import { Nason, Packer, DocumentPacker } from './types'

export const makeNason = <
  OpleRef extends object,
  OpleTime extends object,
  OpleDate extends object,
  OpleDocument extends object
>(
  types: [
    OpleRef: Packer<OpleRef, string>,
    OpleTime: Packer<OpleTime, string>,
    OpleDate: Packer<OpleDate, string>,
    OpleDocument: DocumentPacker<OpleDocument, OpleRef, OpleTime>
  ]
): Nason =>
  use([
    [0, encodeString(types[0])],
    [1, encodeString(types[1])],
    [2, encodeString(types[2])],
    [3, encodeDocument(types[3])],
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

const encodeDocument = <T extends object>({
  test = () => false,
  pack,
  unpack,
}: DocumentPacker<T>): Encoder<T> => ({
  test,
  encode(doc, encode) {
    if (!pack) {
      throw Error('Document packing not supported')
    }
    return arrayType.encode(pack(doc), encode)
  },
  decode(bytes, decode) {
    if (!unpack) {
      throw Error('Document unpacking not supported')
    }
    return unpack(arrayType.decode(bytes, decode) as any)
  },
})

export * from './batch'
export * from './reply'
export * from './types'
