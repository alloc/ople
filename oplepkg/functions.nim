import ./database
import ./error
import ./query
import ./query/array
import ./query/document
import ./query/collection
import ./query/index
import ./query/set

type
  OpleFunction* = proc (
    query: OpleQuery,
    arguments: seq[OpleData]
  ): OpleData

# Hard-coded functions
var functions: Table[string, OpleFunction]

proc addFunction*(name: string, f: OpleFunction) =
  if functions.hasKey(name):
    raise newException(Defect, "function already exists: " & name)
  functions[name] = f

proc assertFunction*(query: OpleQuery, callee: string) =
  if not functions.hasKey callee:
    query.debugPath.add callee
    query.fail "invalid ref", badFunctionRef callee

proc callFunction*(query: OpleQuery, callee: string, args: OpleArray): OpleData =
  return functions[callee](query, args)

# TODO: retrieve callee from "functions" collection
addFunction "call", proc (callee: string, args: OpleArray) {.query.} =
  callFunction(query, callee, args)

# TODO: timestamp argument
addFunction "get", proc (arg: OpleData) {.query.} =
  case arg.kind
  of ople_ref:
    query.getDocument(arguments)
  of ople_set:
    query.first(arguments)
  else:
    query.fail "invalid_argument", "expected a Ref or Set"

#
# Documents
#
addFunction "exists", hasDocument
addFunction "create", newDocument
addFunction "replace", setDocumentData
addFunction "update", updateDocument

#
# Collections
#
addFunction "create_collection", proc (params: OpleObject) {.query.} =
  query.newCollection params
  let name = params["name"].string
  return \{
    "ref": newOpleRef(name, $ople_collections),
    "name": params["name"],
    "ts": \(query.now.toUnixFloat * 1e6),
    "history_days": params.getOrDefault("history_days", \30),
  }

#
# Indexes
#
addFunction "create_index", createIndex

#
# Sets
#
addFunction "paginate", paginate
addFunction "filter", filter
addFunction "map", map
addFunction "reverse", reverse
addFunction "documents", documents

#
# Arrays
#
addFunction "count", count
