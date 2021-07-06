import cbor
import tables
import ../data

const cborOpleTime* = 1001 # map { 1 => seconds, -9 => nanoseconds }
const cborOpleDate* = 1004 # string
const cborOpleRef* = 32768 # string
const cborOpleSet* = 32769 # array [ callee: string, arguments: array ]
const cborOpleLambda* = 32770 # array [ parameters: string[], body: map ]

proc newOpleData(node: CborNode): OpleData

proc newOpleArray*(node: CborNode): auto =
  var data: seq[OpleData]
  for value in node.seq:
    data.add newOpleData(value)
  newOpleArray(data)

proc newOpleObject*(node: CborNode): auto =
  if node.tag == cborOpleRef:

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
