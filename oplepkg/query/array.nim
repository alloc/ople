import ../query

proc count*(s: OpleData) {.query.} =
  case s.kind
  of ople_array:
    return \s.array.len
  of ople_page:
    return \s.page.data.len
  of ople_call:
    # TODO: only evaluate an OpleCall if its related OpleSet
    # has been reduced or filtered.
    raise newException(Defect, "not implemented")
  of ople_set:
    # TODO: just return the associated collection's document count
    raise newException(Defect, "not implemented")
  else:
    query.fail "invalid argument", "expected an Array, Page, or Set"

# const toArray = (arg: any[] | OpleArray) =>
#   Array.isArray(arg) ? arg : arg[kData]
# const intersects = (needle: any, groups: (any[] | OpleArray)[]) =>
#   groups.some((group) =>
#     toArray(group as any).some((elem) => dequal(needle, elem)),
#   )
# const insertUnique = <T>(vals: T[], candidate: T) => {
#   if (!vals.some((val) => dequal(candidate, val))) {
#     vals.push(candidate)
#   }
#   return vals
# }
# const distinct = <T>(vals: T[]) => {
#   const uniques: T[] = []
#   for (const val of vals) {
#     insertUnique(uniques, val)
#   }
#   return uniques
# }
# union<U extends any[] | OpleArray>(
#   ...groups: U[]
# ): OpleArray<T | OpleArrayElement<U>> {
#   const vals = [...this[kData]]
#   for (const group of groups) {
#     for (const val of toArray(group)) {
#       insertUnique(vals, val)
#     }
#   }
#   return new OpleArray(vals)
# }
# mean(): [T] extends [number] ? number : never {
#   return (this.sum() / this[kData].length) as any
# }
# sum(): [T] extends [number] ? number : never {
#   let sum = 0
#   for (const val of this[kData]) {
#     if (typeof val !== 'number') {
#       throw Error('Array must contain numbers only')
#     }
#     sum += val
#   }
#   return sum as any
# }
# toObject(): OpleArrayToObject<T> {
#   const obj: Record<string, any> = {}
#   for (let val of this[kData] as any[]) {
#     // unwrap nested OpleArray
#     if (val && kData in val) {
#       val = val[kData]
#     }
#     // data must be in [string, any] form
#     if (!Array.isArray(val) || val.length < 2 || typeof val[0] !== 'string') {
#       throw Error('Array cannot be converted to object')
#     }
#     obj[val[0]] = val[1]
#   }
#   return obj as any
# }