
type OpleError* = object of CatchableError

proc raiseOpleError*(msg: string) {.raises: [OpleError].} =
  raise newException(OpleError, msg)
