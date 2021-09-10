import macros
import nimdbx
import ./data
import ./error

export data

type
  OpleFailure* = ref object of CatchableError

  OpleQuery* = ref object
    now*: Time
    error*: OpleError
    current*: ptr OpleCall
    expression*: OpleData
    database*: Database
    snapshot*: Snapshot
    callbacks*: OpleCallbacks
    pageParams*: Option[OpleObject]
    pageResult*: Option[OplePage]
    debugPath*: seq[string]
    t: Option[Transaction]

proc fail*(query: OpleQuery, code: string, description: string) {.noreturn.} =
  query.error = OpleError(code: code, description: description)
  raise OpleFailure()

proc transaction*(query: OpleQuery): Transaction =
  if query.t.isNone:
    query.fail "read only", "cannot write in a readonly query"
  result = query.t.get()

proc newQuery*(
  expression: OpleData,
  callbacks: OpleCallbacks,
  database: Database,
  snapshot: Snapshot,
  now: Time,
): OpleQuery =
  result = OpleQuery(
    now: now,
    expression: expression,
    callbacks: callbacks,
    database: database,
    snapshot: snapshot,
    t: if snapshot of Transaction:
      some(cast[Transaction](snapshot))
    else: none(Transaction),
  )

template expectArity*(query: OpleQuery, arguments: OpleArray, arity: int) =
  if arity > arguments.len:
    query.fail "invalid arity", invalidArity(arity)

proc expectArgument*(query: OpleQuery, arguments: OpleArray, index: int): OpleData =
  query.expectArity(arguments, index + 1)
  return arguments[index]

proc expectKind*(query: OpleQuery, data: OpleData, kind: OpleDataKind): OpleData {.discardable.} =
  if data.kind != kind:
    query.fail "invalid argument", invalidKind(kind, data.kind)
  return data

template expectArgument*(query: OpleQuery, arguments: OpleArray, index: int, kind: OpleDataKind): OpleData =
  query.expectKind(query.expectArgument(arguments, index), kind)

proc getArgument*(arguments: OpleArray, index: int): OpleData =
  result =
    if arguments.len > index: arguments[index]
    else: \nil

proc toParams*(arguments: OpleArray): OpleObject =
  for arg in arguments[1..^1]:
    result[arg.debugId] = arg

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
    of ople_set: "set"
    of ople_callback: "invoke"
    else: ""

macro query*(fn: untyped): untyped =
  let prevParams = fn.params

  fn.params = nnkFormalParams.newTree(
    ident("OpleData"),
    newIdentDefs(
      ident("query"),
      ident("OpleQuery")
    ),
    newIdentDefs(
      ident("arguments"),
      ident("OpleArray")
    )
  )

  for i, param in prevParams:
    if i == 0: continue
    var init = newCall(
      ident("expectArgument"),
      ident("query"),
      ident("arguments"),
      newIntLitNode(i - 1)
    )

    let isVar = param[1].kind == nnkVarTy
    let paramType =
      if isVar: param[1][0].strVal
      else: param[1].strVal

    var paramKind: OpleDataKind
    if paramType != "OpleData":
      paramKind = parseOpleDataKind paramType
      init.add ident($paramKind)
      init = newDotExpr(init, ident(paramKind.dataKey))

    fn.body.insert i - 1,
      if isVar: newVarStmt(param[0], init)
      else: newLetStmt(param[0], init)

  return fn

proc exportDocument*(docRef: OpleRef, props: OpleObject): OpleData =
  ## Wrap a parsed document with OpleData so it can be used in a query.
  let data = props.getOrDefault("data", \nil)
  let ts = props["ts"]
  return \{
    "ref": \docRef,
    "data": data,
    "ts": ts,
  }
