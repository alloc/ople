import { WrappedEncoder } from 'nason/src/index'

export interface Nason extends WrappedEncoder {}

export type PackedCall = [method: string, args: any[] | null, replyId: string]
export type PackedReply = [replyId: string, result: any, error?: string]

export interface Packer<T, U> {
  test: (value: unknown) => boolean
  pack: (value: T) => U
  unpack: (value: U) => T
}

export type DocumentPacker<
  OpleDocument extends object = object,
  OpleRef extends object = any,
  OpleTime extends object = any
> =
  | Client.DocumentPacker<OpleRef, OpleTime, OpleDocument>
  | Server.DocumentPacker<OpleRef, OpleTime, OpleDocument>

namespace Client {
  /** Client cannot send an `OpleDocument` */
  export type PackedDocument = never

  export interface DocumentPacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleDocument extends object = object
  > {
    test?: never
    pack?: never
    unpack: (handle: Server.PackedDocument<OpleRef, OpleTime>) => OpleDocument
  }
}

namespace Server {
  export type PackedDocument<
    OpleRef extends object = object,
    OpleTime extends object = object
  > = [ref: OpleRef, ts: OpleTime, data: object]

  export interface DocumentPacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleDocument extends object = object
  > {
    test: (value: unknown) => boolean
    pack: (handle: OpleDocument) => Server.PackedDocument<OpleRef, OpleTime>
    unpack?: never
  }
}
