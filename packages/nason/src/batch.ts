import { utils, WrappedEncoder } from 'nason/src/index'
import arrayType from 'nason/src/types/array'
import stringType from 'nason/src/types/string'
import { PackedCall } from './types'

const { concat, pack, unpack } = utils
const nothing = new Uint8Array([0])

export const makeBatchEncoder = (nason: WrappedEncoder) => (
  id: string,
  calls: PackedCall[]
) => {
  const chunks: Uint8Array[] = [pack(stringType.encode(id))]
  for (let index = 0; index < calls.length; index++) {
    const [method, args, replyId] = calls[index]
    chunks.push(
      pack(stringType.encode(method)),
      args && args.length
        ? pack(arrayType.encode(args, nason.serialize))
        : nothing,
      pack(stringType.encode(replyId))
    )
  }
  return concat(...chunks)
}

export const makeBatchDecoder = (nason: WrappedEncoder) => (
  data: Uint8Array
) => {
  let chunk = unpack(data),
    offset = chunk[1],
    method: string,
    args: any[] | null,
    replyId: string

  const id = stringType.decode(chunk[0])
  const calls: PackedCall[] = []

  while (offset < data.length) {
    // Decode the method name.
    chunk = unpack(data, offset)
    method = stringType.decode(chunk[0])

    // Decode the arguments.
    chunk = unpack(data, chunk[1])
    args = chunk[0].length
      ? arrayType.decode(chunk[0], nason.deserialize)
      : null

    // Decode the reply ID.
    chunk = unpack(data, chunk[1])
    replyId = stringType.decode(chunk[0])

    calls.push([method, args, replyId])

    // Continue to the next chunk.
    offset = chunk[1]
  }

  return [id, calls] as const
}
