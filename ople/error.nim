import ./data

template badRef*(kind: string, name: string): string =
  "Ref refers to undefined " & kind & " '" & name & "'"

template badCollectionRef*(name: string): string =
  badRef "collection", name

template badFunctionRef*(name: string): string =
  badRef "function", name

template unknownFunction*(name: string): string =
  "Undefined function '" & name & "'"

template invalidKind*(expected: OpleDataKind, actual: OpleDataKind): string =
  expected.errorRepr & " expected, " & actual.errorRepr & " received"

template invalidArity*(arity: int): string =
  "Expected at least " & $arity & " argument" & (if arity == 1: "" else: "s")
