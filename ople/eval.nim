import ./functions
import ./query

proc eval*(query: OpleQuery, expression: OpleData): OpleData =
  query.debugPath.add expression.debugId

  try:
    return case expression.kind
      of ople_call:
        let call = expression.call
        query.callFunction(call.callee, call.arguments)
      else:
        expression

  except OpleFailure:
    return newOpleError(query.error, query.debugPath)

  finally:
    discard query.debugPath.pop()

proc eval*(query: OpleQuery): OpleData =
  query.eval(query.expression)
