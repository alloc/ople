import cbor
import streams
import napibindings

proc toJS(node: CborNode): napi_value
proc writeCbor(stream: Stream, jsValue: napi_value)

proc toJSArray*(node: CborNode): napi_value =
  var arr: seq[napi_value]
  for value in node.seq:
    arr.add value.toJS
  return \arr

proc toJSObject*(node: CborNode): napi_value =
  var obj: seq[(string, napi_value)]
  for key, value in node.map:
    obj.add (key.text, value.toJS)
  return \obj

proc toJS*(node: CborNode): napi_value =
  result = case node.kind:
    of cborMap: node.toJSObject
    of cborArray: node.toJSArray
    of cborText: \node.text
    of cborFloat: \node.float
    elif node.isBool: \node.getBool
    elif node.isNull: null()
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
