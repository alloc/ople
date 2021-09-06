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
    of "OpleCallback": ople_callback
    else:
      raise newException(Defect, "cannot convert $1 to OpleDataKind" % [t])
