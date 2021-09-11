import ./data

proc badRef*(kind: string, name: string): string {.inline.} =
  "Ref refers to undefined " & kind & " '" & name & "'"

proc badCollectionRef*(name: string): string {.inline.} =
  badRef "collection", name

proc badFunctionRef*(name: string): string {.inline.} =
  badRef "function", name

proc unknownFunction*(name: string): string {.inline.} =
  "Undefined function '" & name & "'"

proc invalidKind*(expected: OpleDataKind, actual: OpleDataKind): string {.inline.} =
  expected.errorRepr & " expected, " & actual.errorRepr & " received"

proc invalidArity*(arity: int): string {.inline.} =
  "Expected at least " & $arity & " argument" & (if arity == 1: "" else: "s")
