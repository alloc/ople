{.experimental: "notnil".}
import nimdbx
import ../database
import ../query
import ./collection
import ./document
import ./index

const
  qCollections = "collections"
  qDocuments = "documents"
  qIndexes = "indexes"
  qGetDocuments = "get_documents" # ople only
  qIndexedRefs = "indexed_refs" # ople only

proc documentRef(cursor: Cursor): OpleRef {.inline.} =
  OpleRef(id: $cursor.key, collection: cursor.snapshot.collection.name)

proc documentProps(cursor: Cursor): OpleObject {.inline.} =
  parseDocument $cursor.value

proc document*(cursor: Cursor, documentRef: OpleRef): OpleDocument {.inline.} =
  let props = cursor.documentProps
  documentRef.toDocument(
    props["data"].object,
    props["ts"].float
  )

proc document*(cursor: Cursor, documentRef: Option[OpleData]): OpleDocument {.inline.} =
  cursor.document documentRef.get.ref

proc getCollection(query: OpleQuery, source: OpleCall): CollectionSnapshot =
  case source.callee

  of qCollections:
    return query
      .getSchema(ople_collections)
      .with(query.snapshot)

  of qIndexes:
    return query
      .getSchema(ople_indexes)
      .with(query.snapshot)

  of qIndexedRefs:
    let collectionRef = source.arguments[0].ref
    let collatorId = source.arguments[1].string

    var collection = query.getIndexCollection(
      collectionRef,
      collatorId,
    )

    if collection.isNil:
      let collate = source.arguments[2].invoke
      collection = query.createIndex(
        collectionRef,
        collatorId,
        collate,
      )

    collection.with(query.snapshot)

  else:
    let collectionRef = source.arguments[0].ref
    return query
      .getCollection(collectionRef.id)
      .with(query.snapshot)

proc makeCursor*(query: OpleQuery, source: OpleCall): OpleCursor =
  var
    cursor = makeCursor(query.getCollection source)
    nextRef: OpleCursor

  if query.pageParams.isSome:
    let
      pageParams = query.pageParams.get
      pageResult = query.pageResult.get
      limit = pageParams.getOrDefault("size", \64).int
      reverse = pageParams.getOrDefault("reverse", \false).bool

    if pageParams.hasKey("ts"):
      raise newException(Defect, "'ts' param of Paginate is not implemented")
    if pageParams.hasKey("before"):
      cursor.maxKey = pageParams["before"].ref.id
    elif pageParams.hasKey("after"):
      cursor.minKey = pageParams["after"].ref.id

    if reverse:
      cursor.last()

    nextRef = proc (): auto =
      let exists =
        if reverse: cursor.prev()
        else: cursor.next()

      if exists:
        let docRef = cursor.documentRef
        let pageSize = pageResult.data.len
        if pageSize < limit:
          if pageSize == 0 and pageParams.hasKey("after"):
            pageResult.before = some(docRef)
          return some(newOpleRef docRef)
        pageResult.after = some(docRef)

      cursor.close()
      none(OpleData)

  else:
    nextRef = proc (): auto =
      if cursor.next():
        some(newOpleRef cursor.documentRef)
      else:
        cursor.close()
        none(OpleData)

  if source.callee == qDocuments:
    return nextRef

  if source.callee == qGetDocuments:
    return proc (): auto =
      let docRef = nextRef()
      if docRef.isSome:
        some(newOpleDocument cursor.document(docRef))
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
