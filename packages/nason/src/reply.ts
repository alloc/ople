import { utils, WrappedEncoder } from 'nason/src/index'
import stringType from 'nason/src/types/string'
import { PackedReply } from './types'

const { concat, pack, unpack } = utils

export const makeReplyEncoder = (nason: WrappedEncoder) => (
  replyId: string,
  result: any,
  error = ''
) =>
  concat(
    pack(stringType.encode(replyId)),
    pack(nason.serialize(result)),
    pack(stringType.encode(error))
  )

export const makeReplyDecoder = (nason: WrappedEncoder) => (
  data: Uint8Array
): PackedReply => {
  let chunk = unpack(data)
  const replyId = stringType.decode(chunk[0])

  chunk = unpack(data, chunk[1])
  const result = nason.deserialize(chunk[0])

  chunk = unpack(data, chunk[1])
  const error = stringType.decode(chunk[0])

  return [replyId, result, error]
}
