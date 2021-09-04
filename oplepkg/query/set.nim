{.experimental: "notnil".}
import nimdbx
import strutils
import options
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

proc paginate(query: OpleQuery, s: OpleSet, params: OpleObject, isMatch: proc (item: OpleData): bool): OpleData =
  ## Fill an OplePage with matching values from an OpleSet.
  let call = s.expr
  query.debugPath.add call.callee
  let limit = params.getOrDefault("size", \64).int
  var matches: OpleArray
  var before: Option[OpleRef]
  var after: Option[OpleRef]
  case call.callee
    of qDocuments, qGetDocuments:
      let shouldGetDocs = call.callee == qGetDocuments
      let colRef = call.arguments[0].ref
      let col = query.getCollection colRef.id
      var cur = query.makeCursor(col, params)
      while matches.len < limit and cur.next():
        let docRef = OpleRef(id: $cur.key, collection: colRef.id)
        var doc: Option[OpleDocument]
        if shouldGetDocs:
          let props = parseDocument($cur.value)
          doc = some docRef.toDocument(props["data"].object, props["ts"].float)
        let match =
          if doc.isNone: newOpleRef(docRef)
          else: newOpleDocument(get(doc))
        if isMatch(match):
          matches.add match

  discard query.debugPath.pop()
  return newOplePage(matches, before, after)

proc paginate*(query: OpleQuery, params: OpleObject, isMatch: proc (item: OpleData): bool): OpleData =
  ## Set pagination for Nim procedures.
  query.paginate(query.expression.set, params, isMatch)

proc find*(query: OpleQuery, isMatch: proc (item: OpleData): bool): OpleData =
  ## Find the first match in a given OpleSet.
  let params = \{ "size": \1 }
  let page = query.paginate(query.expression.set, params.object, isMatch).page
  let results = page.data.array
  if results.len > 0: results[0]
  else: \nil

proc matchAll(item: OpleData): bool = true

proc paginate*(s: OpleSet) {.query.} =
  return query.paginate(s, arguments.toParams, matchAll)
