import macros
import nimdbx
import options
import ./data
import ./error

export data

type
  OpleFailure* = ref object of CatchableError

  OpleQuery* = ref object
    now*: Time
    error*: OpleError
    database*: Database
    snapshot*: Snapshot
    expression*: OpleData
    debugPath*: seq[string]
    t: Option[Transaction]

proc fail*(query: OpleQuery, code: string, description: string) {.noreturn.} =
  query.error = OpleError(code: code, description: description)
  raise OpleFailure()

proc transaction*(query: OpleQuery): Transaction =
  if query.t.isNone:
    query.fail "read only", "cannot write in a readonly query"
  result = query.t.get()

proc newQuery*(expression: OpleData, database: Database, snapshot: Snapshot, now: Time): OpleQuery =
  result = OpleQuery(
    now: now,
    expression: expression,
    database: database,
    snapshot: snapshot,
    t: if snapshot of Transaction:
      some(cast[Transaction](snapshot))
    else: none(Transaction),
  )

template expectArity*(query: OpleQuery, arguments: seq[OpleData], arity: int) =
  if arity > arguments.len:
    query.fail "invalid arity", invalidArity(arity)

proc expectArgument*(query: OpleQuery, arguments: seq[OpleData], index: int): OpleData =
  query.expectArity(arguments, index + 1)
  return arguments[index]

proc expectKind*(query: OpleQuery, data: OpleData, kind: OpleDataKind): OpleData =
  if data.kind != kind:
    query.fail "invalid argument", invalidKind(kind, data.kind)
  return data

template expectArgument*(query: OpleQuery, arguments: seq[OpleData], index: int, kind: OpleDataKind): OpleData =
  query.expectKind(query.expectArgument(arguments, index), kind)

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

  fn.params = nnkFormalParams.newTree(
    newIdentNode("OpleData"),
    newIdentDefs(
      newIdentNode("query"),
      newIdentNode("OpleQuery")
    ),
    newIdentDefs(
      newIdentNode("arguments"),
      newIdentNode("OpleArray")
    )
  )

  for i, param in prevParams:
    if i == 0: continue
    var init = newCall(
      newIdentNode("expectArgument"),
      newIdentNode("query"),
      newIdentNode("arguments"),
      newIntLitNode(i - 1)
    )

    let isVar = param[1].kind == nnkVarTy
    let paramType =
      if isVar: param[1][0].strVal
      else: param[1].strVal

    let paramKind = parseOpleDataKind paramType
    if paramType != "OpleData":
      init.add newIdentNode($paramKind)

    init = newDotExpr(init, newIdentNode(paramKind.dataKey))
    fn.body.insert i - 1,
      if isVar: newVarStmt(param[0], init)
      else: newLetStmt(param[0], init)

  return fn
