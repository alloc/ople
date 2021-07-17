{.experimental: "notnil".}
import nimdbx
import ../query
import ./collection
import ./document

const qDocuments = "documents"
const qGetDocuments = "get_documents" # ople only

proc makeCursor(query: OpleQuery, col: Collection not nil, params: OpleObject): Cursor =
  result = col.makeCursor query.snapshot
  if params.hasKey("ts"):
    raise newException(Defect, "'ts' param of Paginate is not implemented")
  if params.hasKey("before"):
    result.maxKey = params["before"].ref.id
  elif params.hasKey("after"):
    result.minKey = params["after"].ref.id

proc paginate*(s: OpleSet) {.query.} =
  let call = s.expr
  query.debugPath.add call.callee
  let params = arguments.toParams
  let limit = params.getOrDefault("size", \64).int
  var matches: OpleArray
  var before: OpleRef
  var after: OpleRef
  case call.callee
    of qDocuments, qGetDocuments:
      let matchKeys = call.callee == qDocuments
      let colRef = call.arguments[0].ref
      let col = query.getCollection colRef.id
      var cur = query.makeCursor(col, params)
      while matches.len < limit and cur.next():
        let match =
          if matchKeys: newOpleRef($cur.key, colRef.id)
          else: parseDocument($cur.value)
        matches.add match
  discard query.debugPath.pop()
  return newOplePage(matches, before, after)
