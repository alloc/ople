import options
import tables
import times

export options
export tables
export times

const opleDateFormat* = initTimeFormat "yyyy-MM-dd"
const opleTimeFormat* = initTimeFormat "yyyy-MM-dd'T'HH:mm:ss'.'fffffffff'Z'"

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
    ople_object
    ople_array
    ople_error
    ople_page
    ople_set
    ople_callback

  OpleData* = object
    debugId*: string
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
      date*: OpleDate
    of ople_time:
      time*: OpleTime
    of ople_call:
      call*: OpleCall
    of ople_ref:
      `ref`*: OpleRef
    of ople_document:
      document*: OpleDocument
    of ople_object:
      `object`*: Table[string, OpleData]
    of ople_array:
      `array`*: OpleArray
    of ople_error:
      error*: OpleError
      debugPath*: seq[string]
    of ople_page:
      page*: OplePage
    of ople_set:
      set*: OpleSet
    of ople_callback:
      invoke*: OpleCallback

  OpleDate* = DateTime
  OpleTime* = DateTime

  OpleDocument* = ref object of RootObj
    `ref`*: OpleRef
    data*: Table[string, OpleData]
    ts*: float64 # secs since unix epoch

  OplePage* = ref object of RootObj
    data*: OpleArray
    before*: Option[OpleRef]
    after*: Option[OpleRef]

  OpleCursor* = proc (): Option[OpleData]

  OpleSet* = object
    source*: OpleCall
    cursor*: OpleCursor

  # For schema refs, "collection" is an empty string.
  OpleRef* = object
    id*: string
    collection*: string

  OpleCall* = object of RootObj
    callee*: string
    arguments*: seq[OpleData]

  OpleLambda* = object
    parameters*: seq[string]
    body*: OpleCall

  OpleError* = ref object of RootObj
    code*: string
    description*: string

  OpleArray* = seq[OpleData]

  OpleObject* = Table[string, OpleData]

  OpleCallback* = proc (args: varargs[OpleData]): OpleData

  OpleCallbacks* = TableRef[string, OpleCallback]

template isNull*(data: OpleData): bool =
  data.kind == ople_null

proc newOpleNull*(): auto =
  OpleData(kind: ople_null)

proc newOpleBool*(data: bool): auto =
  OpleData(kind: ople_bool, `bool`: data)

proc newOpleInt*(data: int64): auto =
  OpleData(kind: ople_int, `int`: data)

proc newOpleFloat*(data: float64): auto =
  OpleData(kind: ople_float, `float`: data)

proc newOpleString*(data: string): auto =
  OpleData(kind: ople_string, `string`: data)

proc newOpleDate*(data: string): auto =
  OpleData(kind: ople_date, date: parse(data, opleDateFormat))

proc newOpleDate*(date: DateTime): auto =
  OpleData(kind: ople_date, date: date)

proc newOpleTime*(data: string): auto =
  OpleData(kind: ople_time, time: parse(data, opleTimeFormat))

proc newOpleTime*(time: DateTime): auto =
  OpleData(kind: ople_time, time: time)

proc newOpleCall*(callee: string, arguments: seq[OpleData]): auto =
  OpleData(
    kind: ople_call,
    call: OpleCall(
      callee: callee,
      arguments: arguments
    )
  )

proc newOpleRef*(data: OpleRef): auto =
  OpleData(kind: ople_ref, `ref`: data)

proc newOpleRef*(id: string, collection: string): auto =
  OpleData(kind: ople_ref, `ref`: OpleRef(id: id, collection: collection))

proc toDocument*(r: OpleRef, data: OpleObject, ts: float64): OpleDocument =
  OpleDocument(`ref`: r, data: data, ts: ts)

proc newOpleDocument*(doc: OpleDocument): auto =
  OpleData(kind: ople_document, document: doc)

proc newOpleDocument*(r: OpleRef, data: Table[string, OpleData], ts: float64): auto =
  OpleData(kind: ople_document, document: r.toDocument(data, ts))

proc newOpleObject*(data: Table[string, OpleData]): auto =
  OpleData(kind: ople_object, `object`: data)

proc newOpleArray*(data: seq[OpleData]): auto =
  OpleData(kind: ople_array, `array`: data)

proc newOpleError*(error: OpleError, debugPath: seq[string]): auto =
  OpleData(kind: ople_error, error: error, debugPath: debugPath)

proc newOplePage*(page: OplePage): auto =
  OpleData(kind: ople_page, page: page)

proc newOplePage*(data: OpleArray, before: Option[OpleRef], after: Option[OpleRef]): auto =
  OpleData(
    kind: ople_page,
    page: OplePage(
      data: data,
      before: before,
      after: after
    )
  )

proc newOpleSet*(source: OpleCall, cursor: OpleCursor): auto =
  OpleData(kind: ople_set, set: OpleSet(source: source, cursor: cursor))

proc newOpleSet*(source: OpleCall): auto =
  OpleData(kind: ople_set, set: OpleSet(source: source))

proc newOpleSet*(callee: string, arguments: seq[OpleData]): auto =
  newOpleSet(OpleCall(callee: callee, arguments: arguments))

proc newOpleCallback*(invoke: OpleCallback): auto =
  OpleData(kind: ople_callback, invoke: invoke)

# For error messages
proc errorRepr*(kind: OpleDataKind): string =
  result = case kind
    of ople_null: "Null"
    of ople_bool: "Boolean"
    of ople_int: "Integer"
    of ople_float: "Float"
    of ople_string: "String"
    of ople_date: "Date"
    of ople_time: "Time"
    of ople_call: "Call"
    of ople_ref: "Ref"
    of ople_document: "Document"
    of ople_object: "Object"
    of ople_array: "Array"
    of ople_error: "Error"
    of ople_page: "Page"
    of ople_set: "Set"
    of ople_callback: "Callback"
