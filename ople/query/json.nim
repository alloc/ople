import std/json
import std/parsejson
import std/strutils
import streams
import tables
import ./types

proc toOpleQuery*(p: var JsonParser): OpleQuery

proc parseStringLit*(p: var JsonParser): string =
  if p.tok != tkString:
    raiseParseErr(p, "expected string literal")
  result = p.a
  discard getTok(p)

proc parseTable*(p: var JsonParser): Table[string, string] =
  if p.tok != tkCurlyLe:
    raiseParseErr(p, "expected an object")
  discard getTok(p)
  while p.tok != tkCurlyRi:
    let key = parseStringLit(p)
    eat(p, tkColon)
    result[key] = p.a
    discard getTok(p)
    if p.tok != tkComma: break
    discard getTok(p)
  eat(p, tkCurlyRi)

proc toOpleRef*(p: var JsonParser): OpleQuery =
  let props = parseTable(p)
  if props.hasKey "collection":
    let collection = OpleCollectionRef(id: props["collection"])
    return OpleDocumentRef(id: props["id"], collection: collection)
  return OpleCollectionRef(id: props["id"])

proc toOpleTime*(p: var JsonParser): OpleQuery =
  return OpleTime(data: parseStringLit(p))

proc toOpleDate*(p: var JsonParser): OpleQuery =
  return OpleDate(data: parseStringLit(p))

proc toOpleObject*(p: var JsonParser): OpleQuery =
  if p.tok != tkCurlyLe:
    raiseParseErr(p, "expected object")
  discard getTok(p)
  var obj: OpleObject
  while p.tok != tkCurlyRi:
    let key = parseStringLit(p)
    eat(p, tkColon)
    obj.data[key] = p.toOpleQuery()
    if p.tok != tkComma: break
    discard getTok(p)
  eat(p, tkCurlyRi)
  return obj

proc toOpleCall*(p: var JsonParser): OpleQuery =
  var call = OpleCall()
  while p.tok != tkCurlyRi:
    let key = parseStringLit(p)
    eat(p, tkColon)
    # TODO: determine callee based on key
    # call.arguments.add(p.toOpleQuery())
    if p.tok != tkComma: break
    discard getTok(p)
  return call

proc toOpleQuery*(p: var JsonParser): OpleQuery =
  case p.tok

  of tkString:
    var q = OpleString()
    shallowCopy(q.data, p.a)
    p.a = "" # Reset the buffer after copy.
    result = q
    discard getTok(p)

  of tkInt:
    result = OpleInteger(data: parseBiggestInt(p.a))
    discard getTok(p)

  of tkFloat:
    result = OpleDouble(data: parseFloat(p.a))
    discard getTok(p)

  of tkTrue:
    result = OpleBool(data: true)
    discard getTok(p)

  of tkFalse:
    result = OpleBool(data: false)
    discard getTok(p)

  of tkNull:
    result = OpleNull()
    discard getTok(p)

  of tkCurlyLe:
    discard getTok(p)

    if p.tok == tkCurlyRi:
      return OpleObject()

    if p.tok != tkString:
      raiseParseErr(p, "expected string literal")

    let next: proc(p: var JsonParser): OpleQuery = case p.a
      of "@ref": toOpleRef
      of "@obj": nil
      of "@ts": toOpleTime
      of "@date": toOpleDate
      else: toOpleCall

    if next != toOpleCall:
      discard getTok(p)
      eat(p, tkColon)

    if next == nil:
      result = p.toOpleObject()

    result = next(p)
    eat(p, tkCurlyRi)

  of tkBracketLe:
    var elements: seq[OpleQuery]
    discard getTok(p)
    while p.tok != tkBracketRi:
      elements.add(p.toOpleQuery())
      if p.tok != tkComma: break
      discard getTok(p)
    eat(p, tkBracketRi)
    result = OpleArray(data: elements)

  of tkError, tkCurlyRi, tkBracketRi, tkColon, tkComma, tkEof:
    raiseParseErr(p, "{")

proc toOpleQuery*(s: Stream): OpleQuery =
  var p: JsonParser
  p.open(s, "")
  try:
    discard getTok(p) # read first token
    result = p.toOpleQuery()
    eat(p, tkEof) # check if there is no extra data
  finally:
    p.close()
