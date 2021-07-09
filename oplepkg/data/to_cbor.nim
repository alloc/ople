import cbor
import streams
import tables
import times
import ../data
import ./from_cbor

proc writeCbor*(stream: Stream, data: OpleData)

proc writeCbor*(stream: Stream, obj: OpleObject) =
  stream.writeCborMapLen obj.len
  for key, value in obj:
    stream.writeCbor key
    stream.writeCbor value

proc writeCbor*(stream: Stream, arr: OpleArray) =
  stream.writeCborArrayLen arr.len
  for element in arr:
    stream.writeCbor element

proc writeCbor*(stream: Stream, date: OpleDate) =
  stream.writeCborTag cborOpleDate
  stream.writeCbor date.format opleDateFormat

proc writeCbor*(stream: Stream, time: OpleTime) =
  stream.writeCborTag cborOpleTime
  stream.writeCbor time.format opleTimeFormat

proc writeCbor*(stream: Stream, r: OpleRef) =
  stream.writeCborTag cborOpleRef
  stream.writeCbor r.collection & "/" & r.id

proc writeCbor*(stream: Stream, data: OpleData, kind: OpleDataKind) =
  case kind
    of ople_null:
      stream.writeCbor %nil
    of ople_bool:
      stream.writeCbor data.bool
    of ople_int:
      stream.writeCbor data.int
    of ople_float:
      stream.writeCbor data.float
    of ople_string:
      stream.writeCbor data.string
    of ople_date:
      stream.writeCbor data.date
    of ople_time:
      stream.writeCbor data.time
    of ople_call:
      raise newException(Defect, "ople_call cannot be stored")
    of ople_ref:
      stream.writeCbor data.ref
    of ople_document:
      stream.writeCbor data.document
    of ople_object:
      stream.writeCbor data.object
    of ople_array:
      stream.writeCbor data.array
    of ople_error:
      raise newException(Defect, "ople_error cannot be stored")
    of ople_page:
      raise newException(Defect, "ople_page cannot be stored")
    of ople_set:
      stream.writeCborTag cborOpleSet
      stream.writeCborArrayLen 2
      stream.writeCbor data.query.callee
      stream.writeCbor data.query.arguments

proc writeCbor*(stream: Stream, data: OpleData) =
  stream.writeCbor data, data.kind
