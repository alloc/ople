import strutils
import ./data/types

export types

var emptyTable: OpleObject
let emptyOpleObject* = emptyTable

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
