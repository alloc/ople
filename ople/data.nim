import tables
import ./error

type
  OpleDataKind* = enum
    ople_null
    ople_bool
    ople_int
    ople_float
    ople_string
    ople_date
    ople_time
    ople_call
    ople_ref
    ople_document
    ople_collection
    ople_object
    ople_array
    ople_page
    ople_set

  OpleData* = object
    case kind*: OpleDataKind
    of ople_null: discard
    of ople_bool:
      `bool`*: bool
    of ople_int:
      `int`*: int64
    of ople_float:
      `float`*: float64
    of ople_string:
      `string`*: string
    of ople_date:
      date*: string
    of ople_time:
      time*: string
    of ople_call:
      callee*: string
      arguments*: seq[OpleData]
    of ople_ref:
      `ref`*: OpleRef
    of ople_document:
      document*: OpleDocument
    of ople_collection:
      collection*: string
    of ople_object:
      `object`*: Table[string, OpleData]
    of ople_array:
      `array`*: seq[OpleData]
    of ople_page:
      page*: OplePage
    of ople_set:
      query*: OpleCall

  OpleDocument* = ref object of RootObj
    `ref`*: OpleRef
    data*: Table[string, OpleData]
    ts*: OpleData

  OplePage* = ref object of RootObj
    data*: OpleData
    before*: OpleRef
    after*: OpleRef

  OpleRef* = object
    id*: string
    collection*: string

  OpleCall* = object
    callee*: string
    arguments*: seq[OpleData]

proc toOpleRef*(data: OpleData): OpleRef =
  if data.kind == ople_ref:
    return data.ref
  raiseOpleError "expected a Ref"

proc newOpleNull*(): auto =
  OpleData(kind: ople_null)

proc newOpleBool*(x: bool): auto =
  OpleData(kind: ople_bool, `bool`: x)

proc newOpleInt*(x: int64): auto =
  OpleData(kind: ople_int, `int`: x)

proc newOpleFloat*(x: float64): auto =
  OpleData(kind: ople_float, `float`: x)

proc newOpleString*(x: string): auto =
  OpleData(kind: ople_string, `string`: x)

proc newOpleDate*(x: string): auto =
  OpleData(kind: ople_date, date: x)

proc newOpleTime*(x: string): auto =
  OpleData(kind: ople_time, time: x)

proc newOpleCall*(callee: string, arguments: seq[OpleData]): auto =
  OpleData(kind: ople_call, callee: callee, arguments: arguments)

proc newOpleRef*(id: string, collection: string): auto =
  OpleData(kind: ople_ref, `ref`: OpleRef(id: id, collection: collection))

proc newOpleDocument*(`ref`: OpleRef, data: Table[string, OpleData], ts: string): auto =
  OpleData(
    kind: ople_document,
    document: OpleDocument(
      `ref`: `ref`,
      data: data,
      ts: newOpleTime(ts)
    )
  )

proc newOpleCollectionRef*(x: string): auto =
  OpleData(kind: ople_collection, collection: x)

proc newOpleObject*(x: Table[string, OpleData]): auto =
  OpleData(kind: ople_object, `object`: x)

proc newOpleArray*(x: seq[OpleData]): auto =
  OpleData(kind: ople_array, `array`: x)

proc newOplePage*(data: seq[OpleData], before: OpleRef, after: OpleRef): auto =
  OpleData(
    kind: ople_page,
    page: OplePage(
      data: newOpleArray(data),
      before: before,
      after: after
    )
  )

proc newOpleSet*(x: OpleCall): auto =
  OpleData(kind: ople_set, query: x)
