import tables
import ./data
import ./error

type OpleFunction* = proc (
  arguments: seq[OpleData]
): OpleData

var functions: Table[string, OpleFunction]

proc callFunction*(callee: string, arguments: seq[OpleData]): OpleData =
  let f = functions[callee]
  if f == nil: raiseOpleError "Undefined function '" & callee & "'"
  f(arguments)

proc addFunction(name: string, f: proc (arguments: seq[OpleQuery]): OpleData) =
  if functions.hasKey(name):
    raise newException(Defect, "Function already exists: " & name)
  functions[name] = f

template addFunction*(name: string, impl: untyped) =
  addFunction(
    name,
    proc (arguments {.inject.}: seq[OpleQuery]): OpleData =
      impl
  )
