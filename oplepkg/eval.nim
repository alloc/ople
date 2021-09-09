import sequtils
import strutils
import tables
import ./functions
import ./query
import ./query/cursor

export newQuery, OpleQuery

proc eval*(query: OpleQuery, expression: OpleData): OpleData

const
  qIf = "if"
  qOr = "or"
  qAnd = "and"
  qPaginate = "paginate"
  qReverse = "reverse"

proc eval*(query: OpleQuery, call: OpleCall): OpleData =
  case call.callee
  of qIf:
    query.expectArity(call.arguments, 3)
    let condExpr = call.arguments[0]
    let condVal = query.eval condExpr
    query.expectKind(condVal, ople_bool)
    let branchIdx = if condVal.bool: 1 else: 2
    let branchExpr = call.arguments[branchIdx]
    return query.eval branchExpr
  of qOr:
    query.expectArity(call.arguments, 1)
    for argument in call.arguments:
      let val = query.eval argument
      if val.kind == ople_bool and val.bool:
        return \true
    return \false
  of qAnd:
    query.expectArity(call.arguments, 1)
    for argument in call.arguments:
      let val = query.eval argument
      if val.kind != ople_bool or not val.bool:
        return \false
    return \true

  query.assertFunction(call.callee)

  let oldPageParams = query.pageParams
  let oldPageResult = query.pageResult

  let isPaginate = call.callee == qPaginate
  if isPaginate:
    query.pageParams = some call.arguments.toParams
    query.pageResult = some OplePage(data: newSeq[OpleData]())

  if query.pageParams.isSome and call.callee == qReverse:
    query.pageParams.get["reverse"] = \true

  # Evaluate any nested calls.
  var arguments: OpleArray
  for argument in call.arguments:
    arguments.add query.eval argument

  query.current = unsafeAddr call
  result = query.callFunction(call.callee, arguments)
  query.current = nil

  if isPaginate:
    query.pageParams = oldPageParams
    query.pageResult = oldPageResult

proc eval*(query: OpleQuery, obj: OpleObject): OpleData =
  result = OpleData(kind: ople_object)
  for key, data in obj:
    result.object[key] = query.eval data

proc eval*(query: OpleQuery, arr: OpleArray): OpleData =
  \arr.map proc (data: OpleData): OpleData =
    query.eval data

proc eval*(query: OpleQuery, s: OpleSet): OpleData =
  newOpleSet s.source, query.makeCursor(s.source)

proc eval*(query: OpleQuery, expression: OpleData): OpleData =
  let hasDebugId = expression.debugId != ""
  if hasDebugId:
    query.debugPath.add expression.debugId

  # echo "eval: " & query.debugPath.join(".") & " [" & $expression.kind & "]"

  try:
    return case expression.kind
      of ople_call: query.eval expression.call
      of ople_object: query.eval expression.object
      of ople_array: query.eval expression.array
      of ople_set: query.eval expression.set
      else: expression

  except OpleFailure:
    return newOpleError(query.error, query.debugPath)

  finally:
    if hasDebugId:
      discard query.debugPath.pop()

template eval*(query: OpleQuery): OpleData =
  query.eval(query.expression)
