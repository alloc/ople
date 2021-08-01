import { OpleTime, OpleRef } from './values'

/** Configuration for `@ople/nason` */
export type Config<OpleRecord> = {
  isRecord: (value: any) => boolean
} & RecordPacking<OpleRecord>

type RecordPacking<Record> =
  | Client.RecordPacking<Record>
  | Server.RecordPacking<Record>

namespace Client {
  export type RecordPacking<OpleRecord> = {
    packRecord: (record: OpleRecord) => OpleRef
    unpackRecord: (record: PackedRecord) => OpleRecord
  }
}

namespace Server {
  export type RecordPacking<OpleRecord> = {
    packRecord: (record: OpleRecord) => PackedRecord
    unpackRecord: (ref: string) => OpleRef
  }
}

export type PackedRecord = [ref: OpleRef, ts: OpleTime, data: any]

export type PackedCall = [method: string, args: any[] | null, replyId: string]

export type Reply = [replyId: string, result: any, error?: string]
