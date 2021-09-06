import std/json
import std/parsejson
import std/strutils
import streams
import tables
import ../data

type OpleParser = object of JsonParser
  callbacks*: OpleCallbacks

proc parseOpleData(p: var OpleParser): OpleData

proc raiseCustomParseErr(p: OpleParser, msg: string) {.noReturn.} =
  raise newException(JsonParsingError, "($1, $2) Error: $3" % [$getLine(p), $getColumn(p), msg])

proc parseOpleData*(s: Stream, callbacks: OpleCallbacks): OpleData =
  var p: OpleParser
  p.callbacks = callbacks
  p.open(s, "")
  try:
    discard getTok(p) # read first token
    result = parseOpleData(p)
    eat(p, tkEof) # check if there is no extra data
  finally:
    p.close()

proc parseOpleData*(s: string, callbacks: OpleCallbacks): OpleData =
  parseOpleData newStringStream(s), callbacks

proc parseStringLit(p: var OpleParser): string =
  if p.tok != tkString:
    raiseParseErr(p, "expected string literal")
  result = p.a
  p.a = ""
  discard getTok(p)

proc parseOpleRef(p: var OpleParser): OpleData =
  eat(p, tkCurlyLe)
  var key = parseStringLit(p)
  if key != "id":
    raiseCustomParseErr(p, "expected 'id' key, got '$1'" % [key])
  eat(p, tkColon)
  var id = parseStringLit(p)
  var collection: string
  if p.tok == tkComma:
    eat(p, tkComma)
    key = parseStringLit(p)
    if key != "collection":
      raiseCustomParseErr(p, "expected 'collection' key, got '$1'" % [key])
    eat(p, tkColon)
    let value = parseOpleData(p)
    if value.kind != ople_ref:
      raiseCustomParseErr(p, "expected 'collection' to be ople_ref, but got $1" % [$value.kind])
    collection = value.ref.id
  else:
    id = case id
      of "collections": "ople_collections"
      else: raiseCustomParseErr(p, "expected native collection, got '$1'" % [id])
  eat(p, tkCurlyRi)
  newOpleRef id, collection

proc parseOpleTime(p: var OpleParser): OpleData =
  newOpleTime parseStringLit(p)

proc parseOpleDate(p: var OpleParser): OpleData =
  newOpleDate parseStringLit(p)

proc parseOpleObject(p: var OpleParser): OpleData =
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

proc parseOpleCall(p: var OpleParser): OpleData =
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

proc parseOpleSet(p: var OpleParser): OpleData =
  eat(p, tkCurlyLe)
  let source = parseOpleCall(p).call
  eat(p, tkCurlyRi)
  newOpleSet source

proc parseOpleCallback(p: var OpleParser): OpleData =
  let id = parseStringLit(p)
  newOpleCallback p.callbacks[id]

proc parseOpleData(p: var OpleParser): OpleData =
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
    let parseSpecial: proc(p: var OpleParser): OpleData =
      case firstKey
      of "@ref": parseOpleRef
      of "@ts": parseOpleTime
      of "@date": parseOpleDate
      of "@set": parseOpleSet
      of "@callback": parseOpleCallback
      else: nil

    if parseSpecial != nil or firstKey == "@obj":
      p.a = ""
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
