import nimdbx
import ../query
import ./collection
import ./document

const
  qDocuments = "documents"
  qGetDocuments = "get_documents" # ople only

proc documentRef(cursor: Cursor): OpleRef {.inline.} =
  OpleRef(id: $cursor.key, collection: cursor.snapshot.collection.name)

proc documentProps(cursor: Cursor): OpleObject {.inline.} =
  parseDocument $cursor.value

proc document(cursor: Cursor): OpleDocument {.inline.} =
  let props = cursor.documentProps
  cursor.documentRef.toDocument(
    props["data"].object, 
    props["ts"].float
  )

proc makeCursor*(query: OpleQuery, source: OpleCall): OpleCursor =
  var
    collectionRef = source.arguments[0].ref
    collection = query.getCollection collectionRef.id
    cursor = collection.makeCursor query.snapshot
    pageParams = query.pageParams.get
    pageResult = query.pageResult.get
    limit = pageParams.getOrDefault("size", \64).int

  if pageParams.hasKey("ts"):
    raise newException(Defect, "'ts' param of Paginate is not implemented")
  if pageParams.hasKey("before"):
    cursor.maxKey = pageParams["before"].ref.id
  elif pageParams.hasKey("after"):
    cursor.minKey = pageParams["after"].ref.id

  let nextRef = proc (): auto =
    if cursor.next():
      let docRef = cursor.documentRef
      let pageSize = pageResult.data.len
      if pageSize < limit:
        if pageSize == 0 and pageParams.hasKey("after"):
          pageResult.before = some(docRef)
        return some(newOpleRef docRef)
      pageResult.after = some(docRef)
    none(OpleData)

  if source.callee == qDocuments:
    return nextRef

  if source.callee == qGetDocuments:
    return proc (): auto =
      let docRef = nextRef()
      if docRef.isSome:
        some(newOpleDocument cursor.document)
      else: docRef

  query.fail "invalid_set", "Set does not exist"

proc wrapCursor*(query: OpleQuery, wrapper: OpleCursor): OpleData =
  ## For functions that generate a set by manipulating an existing cursor.
  newOpleSet(query.current[], wrapper)

iterator items*(next: OpleCursor): OpleData =
  while true:
    let data = next()
    if data.isSome:
      yield get(data)
    else: break
