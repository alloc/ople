import cbor
import options
import strutils
import tables
import ../data

export parseCbor

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
  try:
    let tag = int64(node.tag)
    if tag == cborOpleTime:
      raise newException(Defect, "not implemented")
  except:
    var data: Table[string, OpleData]
    for key, value in node.map:
      data[key.text] = newOpleData(value)
    return newOpleObject(data)

proc newOpleRef*(node: CborNode): OpleData =
  let parts = node.text.split '/'
  newOpleRef parts[1], parts[0]

proc newOpleString*(node: CborNode): OpleData =
  try:
    let tag = int64(node.tag)
    if tag == cborOpleRef: 
      return newOpleRef(node)
    if tag == cborOpleDate: 
      return newOpleDate(node.text)
  except:
    echo $getCurrentException().type
    return newOpleString(node.text)

proc newOpleData*(node: CborNode): OpleData =
  case node.kind
  of cborMap: newOpleObject(node)
  of cborArray: newOpleArray(node)
  of cborText: newOpleString(node)
  of cborUnsigned: newOpleInt(int64(node.uint))
  of cborNegative: newOpleInt(node.int)
  of cborFloat: newOpleFloat(node.float)
  elif node.isBool: newOpleBool(node.getBool)
  elif node.isNull: newOpleNull()
  else:
    raise newException(Defect, "unknown cbor type: " & $node.kind)