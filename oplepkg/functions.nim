import tables
import ./error
import ./query
import ./query/document

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

proc callFunction*(query: OpleQuery, callee: string, args: OpleArray): OpleData =
  let fn = functions[callee]
  if fn == nil:
    query.fail "invalid ref", badFunctionRef callee
  return fn(query, args)

# TODO: retrieve callee from "functions" collection
addFunction "call", proc (callee: string, args: OpleArray) {.query.} =
  callFunction(query, callee, args)

addFunction "get", getDocument
addFunction "exists", hasDocument
addFunction "create", newDocument
addFunction "replace", setDocumentData