import std/json
import std/parsejson
import std/strutils
import streams
import tables
import ../data

proc parseOpleData(p: var JsonParser): OpleData

proc parseOpleData*(s: Stream): OpleData =
  var p: JsonParser
  p.open(s, "")
  try:
    discard getTok(p) # read first token
    result = parseOpleData(p)
    eat(p, tkEof) # check if there is no extra data
  finally:
    p.close()

proc parseStringLit(p: var JsonParser): string =
  if p.tok != tkString:
    raiseParseErr(p, "expected string literal")
  result = p.a
  discard getTok(p)

proc parseTable(p: var JsonParser): Table[string, string] =
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

proc parseOpleRef(p: var JsonParser): OpleData =
  let props = parseTable(p)
  newOpleRef props["id"], props["collection"]

proc parseOpleTime(p: var JsonParser): OpleData =
  newOpleTime parseStringLit(p)

proc parseOpleDate(p: var JsonParser): OpleData =
  newOpleDate parseStringLit(p)

proc parseOpleObject(p: var JsonParser): OpleData =
  if p.tok != tkCurlyLe:
    raiseParseErr(p, "expected object")
  discard getTok(p)
  var obj: Table[string, OpleData]
  while p.tok != tkCurlyRi:
    let key = parseStringLit(p)
    eat(p, tkColon)
    var value = parseOpleData(p)
    value.debugId = key
    obj[key] = value
    if p.tok != tkComma: break
    discard getTok(p)
  eat(p, tkCurlyRi)
  newOpleObject(obj)

proc parseOpleCall(p: var JsonParser): OpleData =
  let callee = parseStringLit(p)
  eat(p, tkColon)
  var debugId = callee
  var arguments: seq[OpleData]
  while p.tok != tkCurlyRi:
    var argument = parseOpleData(p)
    argument.debugId = debugId
    arguments.add argument
    if p.tok != tkComma: break
    discard getTok(p)
    debugId = parseStringLit(p)
    eat(p, tkColon)
  newOpleCall(callee, arguments)

proc parseOpleData(p: var JsonParser): OpleData =
  case p.tok

  of tkString:
    var q = OpleData(kind: ople_string)
    shallowCopy(q.string, p.a)
    p.a = "" # Reset the buffer after copy.
    result = q
    discard getTok(p)

  of tkInt:
    result = newOpleInt parseBiggestInt(p.a)
    discard getTok(p)

  of tkFloat:
    result = newOpleFloat parseFloat(p.a)
    discard getTok(p)

  of tkTrue:
    result = newOpleBool(true)
    discard getTok(p)

  of tkFalse:
    result = newOpleBool(false)
    discard getTok(p)

  of tkNull:
    result = newOpleNull()
    discard getTok(p)

  of tkCurlyLe:
    discard getTok(p)

    if p.tok == tkCurlyRi:
      return OpleData(kind: ople_object)

    if p.tok != tkString:
      raiseParseErr(p, "expected string literal")

    let firstKey = p.a
    let parseSpecial: proc(p: var JsonParser): OpleData =
      case firstKey
      of "@ref": parseOpleRef
      of "@ts": parseOpleTime
      of "@date": parseOpleDate
      else: nil

    if parseSpecial != nil or firstKey == "@obj":
      discard getTok(p)
      eat(p, tkColon)

    result =
      if parseSpecial != nil: parseSpecial(p)
      elif firstKey == "@obj": parseOpleObject(p)
      else: parseOpleCall(p)
    eat(p, tkCurlyRi)

  of tkBracketLe:
    var index = 0
    var elements: seq[OpleData]
    discard getTok(p)
    while p.tok != tkBracketRi:
      var element = parseOpleData(p)
      element.debugId = $index
      elements.add element
      if p.tok != tkComma: break
      discard getTok(p)
      inc index
    eat(p, tkBracketRi)
    result = newOpleArray(elements)

  of tkError, tkCurlyRi, tkBracketRi, tkColon, tkComma, tkEof:
    raiseParseErr(p, "{")
