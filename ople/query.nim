import macros
import nimdbx
import ./data
import ./error

export data

type
  OpleFailure* = object of CatchableError

  OpleQuery* = ref object
    now*: OpleTime
    error*: OpleError
    database*: Database
    snapshot*: Snapshot
    transaction: Transaction
    expression*: OpleData
    debugPath*: seq[string]

proc fail*(query: OpleQuery, code: string, description: string) {.raises OpleFailure.} =
  query.error = OpleError(code: code, description: description)
  raise newException(OpleFailure, "query failed")

proc transaction*(query: OpleQuery): Transaction =
  result = query.transaction
  if result == nil:
    query.fail "read only", "cannot write in a readonly query"

proc expectArgument*(query: OpleQuery, arguments: seq[OpleData], index: int): OpleData =
  if index < arguments.len:
    return arguments[index]
  query.fail "invalid arity", invalidArity(index + 1)

proc expectArgument*(query: OpleQuery, arguments: seq[OpleData], index: int, kind: OpleDataKind): OpleData =
  let argument = query.expectArgument(arguments, index)
  if argument.kind == kind:
    return argument
  query.fail "invalid argument", invalidKind(kind, argument.kind)

proc dataKey(kind: OpleDataKind): string =
  result = case kind
    of ople_bool: "bool"
    of ople_int: "int"
    of ople_float: "float"
    of ople_string: "string"
    of ople_date: "date"
    of ople_time: "time"
    of ople_call: "call"
    of ople_ref: "ref"
    of ople_document: "document"
    of ople_object: "object"
    of ople_array: "array"
    of ople_page: "page"
    else: "repr"

macro query*(fn: untyped): untyped =
  let prevParams = fn.params

  fn.params = newNimNode(nnkFormalParams).add(
    prevParams[0],
    newIdentDefs(
      newIdentNode("query"),
      newIdentNode("OpleQuery")
    ),
    newIdentDefs(
      newIdentNode("arguments"),
      newNimNode(nnkBracketExpr).add(
        newIdentNode("seq"),
        newIdentNode("OpleData")
      )
    )
  )

  for i, param in prevParams:
    if i == 0: continue
    var init = newCall(
      newIdentNode("expectArgument"),
      newIntLitNode(i - 1)
    )

    let paramType = param[1].strVal
    let paramKind = parseOpleDataKind paramType

    if paramType == "OpleData":
      init.add newIdentNode($paramKind)

    init = newDotExpr(init, newIdentNode(paramKind.dataKey))
    fn.body.insert i - 1, newLetStmt(param[0], init)

  echo fn.treeRepr
  return fn

proc newQuery*(expression: OpleData, database: Database): OpleQuery =
  result.expression = expression
  result.database = database
  # TODO: result.now =
