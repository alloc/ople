{.experimental: "notnil".}
import nimdbx
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

# Find the first match in a given OpleSet.
proc find*(query: OpleQuery, s: OpleSet, isFound: proc (item: OpleData): bool): OpleData =
  result = \nil
  let call = s.expr
  query.debugPath.add call.callee
  case call.callee
    of qDocuments, qGetDocuments:
      let shouldGetDocs = call.callee == qGetDocuments
      let colRef = call.arguments[0].ref
      let col = query.getCollection colRef.id
      var cur = query.makeCursor(col, emptyOpleObject)
      while cur.next():
        let docRef = OpleRef(id: $cur.key, collection: colRef.id)
        var doc: OpleDocument
        if shouldGetDocs:
          let props = parseDocument($cur.value)
          doc = docRef.toDocument(props["data"].object, props["ts"].float)
        let match =
          if shouldGetDocs: newOpleRef(docRef)
          else: newOpleDocument(doc)
        if isFound(match):
          discard query.debugPath.pop()
          return match

proc paginate*(s: OpleSet) {.query.} =
  let call = s.expr
  query.debugPath.add call.callee
  let params = arguments.toParams
  let limit = params.getOrDefault("size", \64).int
  var matches: OpleArray
  var before: Option[OpleRef]
  var after: Option[OpleRef]
  echo "callee => " & call.callee
  echo "limit => " & $limit
  echo "params => " & params.repr
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
          if shouldGetDocs: newOpleRef(docRef)
          else: newOpleDocument(get(doc))
        matches.add match

  discard query.debugPath.pop()
  return newOplePage(matches, before, after)
