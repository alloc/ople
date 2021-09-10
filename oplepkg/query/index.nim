{.experimental: "notnil".}
import nimdbx
from strutils import split
import strformat
import ../data/[to_cbor,from_cbor]
import ../database
import ../query

proc toIndexKey(data: OpleData): Collatable =
  case data.kind
  of ople_int:
    result.add data.int
  of ople_string:
    result.add data.string
  of ople_bool:
    result.add data.bool
  of ople_array:
    for val in data.array:
      case val.kind
      of ople_int:
        result.add val.int
      of ople_string:
        result.add val.string
      of ople_bool:
        result.add val.bool
      of ople_null:
        result.addNull()
      else:
        raise newException(Defect, "Index keys must be an integer, string, boolean, or array")
  of ople_null:
    discard
  else:
    raise newException(Defect, "Index keys must be an integer, string, boolean, or array")

proc identifyIndex*(collectionRef: OpleRef, name: string): string =
  &"index::{collectionRef.id}::{name}"

proc getIndexCollection*(query: OpleQuery, collectionRef: OpleRef, name: string): Collection =
  query.database.getOpenCollection identifyIndex(collectionRef, name)

proc createIndex*(query: OpleQuery, collectionRef: OpleRef, name: string, collate: OpleCallback): Collection not nil =
  let indexes = query.getWritableSchema ople_indexes
  let indexId = collectionRef.id & "::" & name

  if indexes.get(indexId).exists:
    query.fail "instance already exists", "Index already exists."

  var props: OpleObject
  props["ts"] = \(query.now.toUnixFloat * 1e6)
  props["data"] = \{ "source": \collectionRef }
  indexes.put indexId, serializeDocument(props)

  proc indexer(id, dataPtr: DataOut, emit: EmitFunc) =
    {.cast(noSideEffect).}:
      let data = parseDocument $dataPtr
      let indexKey = collate(newOpleObject(data)).toIndexKey
      if not indexKey.isEmpty:
        var indexValue: Collatable
        indexValue.add $id
        emit(indexKey, indexValue)

  let collection = query.database.openCollection(collectionRef.id)
  discard collection.openIndex(name, indexer)

  cast[Collection not nil](
    query.getIndexCollection(collectionRef, name)
  )

proc deleteIndex*(query: OpleQuery, indexId: string): OpleData =
  let splitId = indexId.split "::"
  let indexes = query.getSchema ople_indexes
  query.
