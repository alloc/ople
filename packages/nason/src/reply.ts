import { utils } from 'nason/src/index'
import stringType from 'nason/src/types/string'
import { makeFaunaEncoder } from './fauna'
import { Config, Reply } from './types'

const { concat, pack, unpack } = utils

export function makeReplyEncoder<Record>(config: Config<Record>) {
  const fauna = makeFaunaEncoder(config)
  return (replyId: string, result: any, error = '') =>
    concat(
      pack(stringType.encode(replyId)),
      pack(fauna.serialize(result)),
      pack(stringType.encode(error))
    )
}

export function makeReplyDecoder<Record>(config: Config<Record>) {
  const fauna = makeFaunaEncoder(config)
  return (data: Uint8Array): Reply => {
    let chunk = unpack(data)
    const replyId = stringType.decode(chunk[0])

    chunk = unpack(data, chunk[1])
    const result = fauna.deserialize(chunk[0])

    chunk = unpack(data, chunk[1])
    const error = stringType.decode(chunk[0])

    return [replyId, result, error]
  }
}
