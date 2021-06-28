import napibindings
import classes

type
  OpleArray*[T] = ref object of RootObj
    elements: seq[T]

proc isOpleArray*[T](value: T): bool =
  value of OpleArray

proc registerArrayQueries*(exports: Module) =

  registerFn(exports, 1, "isArray"): isOpleArray(args[0])
