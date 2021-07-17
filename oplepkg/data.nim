import strutils
import tables
import times

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

  OpleDate* = DateTime
  OpleTime* = DateTime

  OpleDocument* = ref object of RootObj
    `ref`*: OpleRef
    data*: Table[string, OpleData]
    ts*: int64 # µsecs since unix epoch

  OplePage* = ref object of RootObj
    data*: OpleData
    before*: OpleRef
    after*: OpleRef

  OpleSet* = ref object of RootObj
    expr*: OpleCall

  OpleRef* = object
    id*: string
    collection*: string

  OpleCall* = object
    callee*: string
    arguments*: seq[OpleData]

  OpleLambda* = object
    parameters*: seq[string]
    body*: OpleCall

  OpleError* = ref object
    code*: string
    description*: string

  OpleArray* = seq[OpleData]

  OpleObject* = Table[string, OpleData]

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

proc newOpleDocument*(`ref`: OpleRef, data: Table[string, OpleData], ts: int64): auto =
  OpleData(
    kind: ople_document,
    document: OpleDocument(
      `ref`: `ref`,
      data: data,
      ts: ts
    )
  )

proc newOpleObject*(data: Table[string, OpleData]): auto =
  OpleData(kind: ople_object, `object`: data)

proc newOpleArray*(data: seq[OpleData]): auto =
  OpleData(kind: ople_array, `array`: data)

proc newOpleError*(error: OpleError, debugPath: seq[string]): auto =
  OpleData(kind: ople_error, error: error, debugPath: debugPath)

proc newOplePage*(data: seq[OpleData], before: OpleRef, after: OpleRef): auto =
  OpleData(
    kind: ople_page,
    page: OplePage(
      data: newOpleArray(data),
      before: before,
      after: after
    )
  )

proc newOpleSet*(expr: OpleCall): auto =
  OpleData(kind: ople_set, set: OpleSet(expr: expr))

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

# Type name to OpleDataKind
proc parseOpleDataKind*(t: string): OpleDataKind =
  result = case t
    of "bool": ople_bool
    of "int64": ople_int
    of "float64": ople_float
    of "string": ople_string
    of "OpleDate": ople_date
    of "OpleTime": ople_time
    of "OpleRef": ople_ref
    of "OpleDocument": ople_document
    of "OpleObject": ople_object
    of "OpleArray": ople_array
    of "OpleError": ople_error
    of "OplePage": ople_page
    of "OpleSet": ople_set
    else:
      raise newException(Defect, "cannot convert $1 to OpleDataKind" % [t])

template `\`*(arg: pointer): OpleData =
  assert(arg.isNil)
  OpleData(kind: ople_null)

template `\`*(arg: bool): OpleData =
  newOpleBool arg

template `\`*(arg: int64): OpleData =
  newOpleInt arg

template `\`*(arg: float64): OpleData =
  newOpleFloat arg

template `\`*(arg: string): OpleData =
  newOpleString arg

template `\`*(arg: OpleObject): OpleData =
  newOpleObject arg

template `\`*[I](arg: array[I, (string, OpleData)]): OpleData =
  newOpleObject arg.toTable

template `\`*(arg: OpleArray): OpleData =
  newOpleArray arg

template `\`*(arg: OpleRef): OpleData =
  newOpleRef arg
