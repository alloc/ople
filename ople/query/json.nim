import std/json
import std/parsejson
import std/strutils
import streams
import tables
import ../query

proc parseTable*(p: var JsonParser): Table[string, string] =
  if p.tok != tkCurlyLe:
    raiseParseErr(p, "expected an object")
  discard getTok(p)
  while p.tok != tkCurlyRi:
    if p.tok != tkString:
      raiseParseErr(p, "string literal as key")
    var key = p.a
    discard getTok(p)
    eat(p, tkColon)
    result[key] = p.a
    discard getTok(p)
    if p.tok != tkComma: break
    discard getTok(p)
  eat(p, tkCurlyRi)

proc toRef*(p: var JsonParser): OpleRef =
  let props = parseTable(p)
  if props.hasKey "collection":
    let collection = OpleCollectionRef(id: props["collection"])
    return OpleDocumentRef(id: props["id"], collection: collection)
  return OpleCollectionRef(id: props["id"])

proc toTime*(p: var JsonParser): OpleTime =
  if p.tok != tkString:
    raiseParseErr(p, "expected string literal")
  discard getTok(p)

proc toDate*(p: var JsonParser): OpleDate =
  let props = parseTable(p)

proc toQuery*(p: var JsonParser): OpleQuery =
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
    if p.tok != tkString:
      raiseParseErr(p, "string literal as key")

    var key = p.a
    discard getTok(p)
    eat(p, tkColon)

    # Check first key for special types.
    result = case key
      of "@ref": p.toRef()
      of "@obj": p.toQuery()
      of "@ts": p.toTime()
      of "@date": p.toDate()
      else: nil
    if result == nil:
      var props: Table[string, OpleQuery]
      while p.tok != tkCurlyRi:
        var val = p.toQuery()
        props[key] = val
        if p.tok != tkComma: break
        discard getTok(p)
        if p.tok != tkString:
          raiseParseErr(p, "string literal as key")
        key = p.a
        discard getTok(p)
        eat(p, tkColon)
      result = OpleObject(data: props)
    eat(p, tkCurlyRi)

  of tkBracketLe:
    var elements: seq[OpleQuery]
    discard getTok(p)
    while p.tok != tkBracketRi:
      elements.add(p.toQuery())
      if p.tok != tkComma: break
      discard getTok(p)
    eat(p, tkBracketRi)
    result = OpleArray(data: elements)

  of tkError, tkCurlyRi, tkBracketRi, tkColon, tkComma, tkEof:
    raiseParseErr(p, "{")

proc toQuery*(s: Stream): OpleQuery =
  var p: JsonParser
  p.open(s, "")
  try:
    discard getTok(p) # read first token
    result = p.toQuery()
    eat(p, tkEof) # check if there is no extra data
  finally:
    p.close()
