import { Ref } from 'fauna-lite'

type Class<T = unknown> = new (...args: any[]) => T

/** Configuration for `@ople/nason` */
export type Config<Record> = {
  /** The `Record` constructor */
  Record: Class<Record>
} & RecordPacking<Record>

type RecordPacking<Record> =
  | Client.RecordPacking<Record>
  | Server.RecordPacking<Record>

namespace Client {
  export type RecordPacking<Record> = {
    packRecord: (record: Record) => Ref
    unpackRecord: (record: PackedRecord) => Record
  }
}

namespace Server {
  export type RecordPacking<Record> = {
    packRecord: (record: Record) => PackedRecord
    unpackRecord: (ref: string) => Ref
  }
}

export type PackedRecord = [ref: Ref, ts: number, data: any]

export type PackedCall = [method: string, args: any[] | null, replyId: string]

export type Reply = [replyId: string, result: any, error?: string]
