import tables
import ./query
import ./error

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

addFunction "Call", proc (callee: string, args: OpleArray) {.query.} =
  callFunction(query, callee, args)
