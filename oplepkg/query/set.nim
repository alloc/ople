import ../query

const qDocuments = "documents"

proc paginate*(call: OpleCall) {.query.} =
  var params: OpleObject
  if arguments.len == 2:
    params = query.expectKind(arguments[1], ople_object).object
  query.debugPath.add call.callee
  case call.callee
    of qDocuments:
      query.expectKind call.arguments
  discard query.debugPath.pop()
  return \nil