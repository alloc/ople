import nimdbx
import ../query
import ./cursor

proc paginate*(s: OpleSet) {.query.} =
  let page = query.pageResult.get
  for data in s.cursor:
    page.data.add(data)
  newOplePage(page)

proc filter*(s: OpleSet, cb: OpleCallback) {.query.} =
  query.wrapCursor do () -> Option[OpleData]:
    for data in s.cursor:
      if cb(data).bool:
        return some(data)
    none(OpleData)

proc map*(s: OpleSet, cb: OpleCallback) {.query.} =
  query.wrapCursor do () -> Option[OpleData]:
    for data in s.cursor:
      return some(cb(data))
    none(OpleData)

proc first*(s: OpleSet) {.query.} =
  s.cursor().get \nil
