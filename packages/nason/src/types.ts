import { WrappedEncoder } from 'nason/src/index'

export interface Nason extends WrappedEncoder {}

export type PackedCall = [method: string, args: any[] | null, replyId: string]
export type PackedReply = [replyId: string, result: any, error?: string]

export interface Packer<T, U> {
  test: (value: unknown) => boolean
  pack: (value: T) => U
  unpack: (value: U) => T
}

export type HandlePacker<
  OpleHandle extends object = object,
  OpleRef extends object = any,
  OpleTime extends object = any
> =
  | Client.HandlePacker<OpleRef, OpleTime, OpleHandle>
  | Server.HandlePacker<OpleRef, OpleTime, OpleHandle>

export type PagerPacker<
  OplePager extends object,
  OpleTime extends object = any
> =
  | Client.PagerPacker<OplePager, OpleTime>
  | Server.PagerPacker<OplePager, OpleTime>

namespace Client {
  /** Client cannot send an `OpleHandle` */
  export type PackedHandle = never

  export interface HandlePacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleHandle extends object = object
  > {
    test?: never
    pack?: never
    unpack: (handle: Server.PackedHandle<OpleRef, OpleTime>) => OpleHandle
  }

  /** Client cannot send an `OplePager` */
  export type PackedPager = never

  export interface PagerPacker<
    OplePager extends object,
    OpleTime extends object
  > {
    test?: never
    pack?: never
    unpack: (pager: Server.PackedPager<OpleTime>) => OplePager
  }
}

namespace Server {
  export type PackedHandle<
    OpleRef extends object = object,
    OpleTime extends object = object
  > = [ref: OpleRef, ts: OpleTime, data: object]

  export interface HandlePacker<
    OpleRef extends object = object,
    OpleTime extends object = object,
    OpleHandle extends object = object
  > {
    test: (value: unknown) => boolean
    pack: (handle: OpleHandle) => Server.PackedHandle<OpleRef, OpleTime>
    unpack?: never
  }

  export type PackedPager<OpleTime extends object> = [
    calleeId: string,
    args: any[],
    page: { data: any[]; before?: any; after?: any },
    size: number | null,
    ts: number | OpleTime | null
  ]

  export interface PagerPacker<
    OplePager extends object,
    OpleTime extends object
  > {
    test: (value: unknown) => boolean
    pack: (pager: OplePager) => Server.PackedPager<OpleTime>
    unpack?: never
  }
}
