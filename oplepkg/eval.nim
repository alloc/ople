import ./functions
import ./query

proc eval*(query: OpleQuery, call: OpleCall): OpleData =
  for i, argument in call.arguments:
    if argument.kind == ople_call:
      call.arguments[i] = query.eval argument.call
  
  query.callFunction(call.callee, call.arguments)

proc eval*(query: OpleQuery, expression: OpleData): OpleData =
  query.debugPath.add expression.debugId

  try:
    return case expression.kind
      of ople_call: query.eval expression.call
      else: expression

  except OpleFailure:
    return newOpleError(query.error, query.debugPath)

  finally:
    discard query.debugPath.pop()

proc eval*(query: OpleQuery): OpleData =
  query.eval(query.expression)
