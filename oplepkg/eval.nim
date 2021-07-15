import sequtils
import strutils
import tables
import ./functions
import ./query

export newQuery, OpleQuery

proc eval*(query: OpleQuery, expression: OpleData): OpleData

const
  qIf = "if"
  qOr = "or"
  qAnd = "and"

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

  # Evaluate any nested calls.
  var arguments: OpleArray
  for i, argument in call.arguments:
    arguments[i] = query.eval argument

  query.callFunction(call.callee, arguments)

proc eval*(query: OpleQuery, obj: OpleObject): OpleData =
  result.kind = ople_object
  for key, data in obj:
    result.object[key] = query.eval data

proc eval*(query: OpleQuery, arr: OpleArray): OpleData =
  \arr.map proc (data: OpleData): OpleData =
    query.eval data

proc eval*(query: OpleQuery, expression: OpleData): OpleData =
  let hasDebugId = expression.debugId != ""
  if hasDebugId:
    query.debugPath.add expression.debugId
  echo "eval: " & query.debugPath.join(".") & " [" & $expression.kind & "]"

  try:
    return case expression.kind
      of ople_call: query.eval expression.call
      of ople_object: query.eval expression.object
      of ople_array: query.eval expression.array
      else: expression

  except OpleFailure:
    return newOpleError(query.error, query.debugPath)

  finally:
    if hasDebugId:
      discard query.debugPath.pop()

template eval*(query: OpleQuery): OpleData =
  query.eval(query.expression)
