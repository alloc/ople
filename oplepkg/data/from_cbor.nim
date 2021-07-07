import cbor
import strutils
import tables
import ../data

const cborOpleTime* = 1001 # map { 1 => seconds, -9 => nanoseconds }
const cborOpleDate* = 1004 # string
const cborOpleRef* = 32768 # string
const cborOpleSet* = 32769 # array [ callee: string, arguments: array ]
const cborOpleLambda* = 32770 # array [ parameters: string[], body: map ]

proc newOpleData*(node: CborNode): OpleData

proc newOpleArray*(node: CborNode): OpleData =
  case int64(node.tag)
  of cborOpleSet:
    raise newException(Defect, "not implemented")
  of cborOpleLambda:
    raise newException(Defect, "not implemented")
  else:
    var data: seq[OpleData]
    for value in node.seq:
      data.add newOpleData(value)
    newOpleArray(data)

proc newOpleObject*(node: CborNode): OpleData =
  case int64(node.tag)
  of cborOpleTime:
    raise newException(Defect, "not implemented")
  else:
    var data: Table[string, OpleData]
    for key, value in node.map:
      data[key.text] = newOpleData(value)
    newOpleObject(data)

proc newOpleRef*(node: CborNode): OpleData =
  let parts = node.text.split '/'
  newOpleRef parts[1], parts[0]

proc newOpleString*(node: CborNode): OpleData =
  case int64(node.tag)
  of cborOpleRef: newOpleRef(node)
  of cborOpleDate: newOpleDate(node.text)
  else: newOpleString(node.text)

proc newOpleData*(node: CborNode): OpleData =
  case node.kind
  of cborMap: newOpleObject(node)
  of cborArray: newOpleArray(node)
  of cborText: newOpleString(node)
  of cborFloat: newOpleFloat(node.float)
  elif node.isBool: newOpleBool(node.getBool)
  elif node.isNull: newOpleNull()
  else:
    raise newException(Defect, "unknown cbor type")
