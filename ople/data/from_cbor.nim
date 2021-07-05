import cbor
import streams
import ../data

const cborOpleTime = 1001 # map { 1 => seconds, -9 => nanoseconds }
const cborOpleDate = 1004 # string
const cborOpleRef = 32768 # array [ collection: string, id: string ]
const cborOpleCollection = 32769 # string
const cborOpleLambda = 32770 # array [ parameters: string[], body: map ]

proc newOpleData(node: CborNode): OpleData
proc writeCbor(stream: Stream, data: OpleData)

proc newOpleArray*(node: CborNode): auto =
  var data: seq[OpleData]
  for value in node.seq:
    data.add newOpleData(value)
  newOpleArray(data)

proc newOpleObject*(node: CborNode): auto =
  if node.tag ==
  var data: Table[string, OpleData]
  for key, value in node.map:
    data[key.text] = newOpleData(value)
  newOpleObject(data)

proc newOpleData*(node: CborNode): OpleData =
  result = case node.kind:
    of cborMap: newOpleObject(node)
    of cborArray: newOpleArray(node)
    of cborText: newOpleString(node.text)
    of cborFloat: newOpleFloat(node.float)
    elif node.isBool: newOpleBool(node.getBool)
    elif node.isNull: newOpleNull()
    else: nil

proc isValidCbor(jsKind: NapiKind): bool =
  case jsKind:
  of napi_null: true
  of napi_boolean: true
  of napi_number: true
  of napi_string: true
  of napi_object: true
  else: false

proc writeCbor*(stream: Stream, jsValue: napi_value, jsKind: NapiKind) =
  if jsKind != napi_object:
    case jsKind:
    of napi_boolean: stream.writeCbor jsValue.getBool
    of napi_number: stream.writeCbor jsValue.getFloat64
    of napi_string: stream.writeCbor jsValue.getStr
    else: stream.writeCbor %nil

  elif jsValue.isArray:
    let count = jsValue.getArrayLength
    stream.writeCborArrayLen count
    var index = 0
    while index < count:
      let element = jsValue.getElement(index)
      let elementKind = element.kind
      if not elementKind.isValidCbor:
        raise newException(ValueError, "array element cannot be encoded")
      stream.writeCbor element, elementKind
      inc index

  else:
    var data: seq[(string, napi_value)]

    let names = jsValue.getPropertyNames
    let count = names.getArrayLength
    var index = 0
    while index < count:
      let name = names.getElement(index).getStr
      inc index

      let value = jsValue.getProperty name
      let valueKind = value.kind
      if valueKind.isValidCbor:
        data.add (name, value)

    stream.writeCborMapLen data.len
    for prop in data:
      stream.writeCbor prop[0]
      stream.writeCbor prop[1]

proc writeCbor*(stream: Stream, jsValue: napi_value) =
  stream.writeCbor jsValue, jsValue.kind
