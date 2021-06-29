import ../functions
import ../query/types

addFunction("count"):
  let s = arguments[0]
  if s of OpleArray:
    return OpleInteger(data: OpleArray(s).data.len)
  if s of OplePage:
    return OpleInteger(data: OplePage(s).data.len)
  if s of OpleSet:
    raise newException(Defect, "not implemented")
  raiseOpleError "expected an Array, Page, or Set"
