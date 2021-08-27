import { WrappedEncoder } from 'nason/src/index'

export interface Nason extends WrappedEncoder {}

export type PackedCall = [method: string, args: any[] | null, replyId: string]
export type PackedReply = [replyId: string, result: any, error?: string]

export interface Packer<T, U> {
  test: (value: unknown) => boolean
  pack: (value: T) => U
  unpack: (value: U) => T
}

export type RecordPacker<
  OpleRecord extends object = object,
  OpleRef extends object = any,
  OpleTime extends object = any
> =
  | Client.RecordPacker<OpleRef, OpleTime, OpleRecord>
  | Server.RecordPacker<OpleRef, OpleTime, OpleRecord>

namespace Client {
  /** Client cannot send an `OpleRecord` */
  export type PackedRecord = never

  export interface RecordPacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleRecord extends object = object
  > {
    test: (value: unknown) => boolean
    pack?: never
    unpack: (record: Server.PackedRecord<OpleRef, OpleTime>) => OpleRecord
  }
}

namespace Server {
  export type PackedRecord<
    OpleRef extends object = object,
    OpleTime extends object = object
  > = [ref: OpleRef, ts: OpleTime, data: object]

  export interface RecordPacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleRecord extends object = object
  > {
    test: (value: unknown) => boolean
    pack: (record: OpleRecord) => Server.PackedRecord<OpleRef, OpleTime>
    unpack?: never
  }
}
