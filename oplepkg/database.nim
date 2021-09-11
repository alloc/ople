{.experimental: "notnil".}
import nimdbx
import strutils
import ./query

export nimdbx

type OpleSchema* = enum
  ople_collections
  ople_indexes

proc initDatabase*(path: string): Database =
  let db = openDatabase path
  discard db.createCollection $ople_collections
  discard db.createCollection $ople_indexes
  return db

proc isSchemaRef*(docRef: OpleRef): bool =
  ## This ref exists in a schema collection.
  try:
    discard parseEnum[OpleSchema](docRef.collection)
    true
  except:
    false

proc getSchema*(query: OpleQuery, schema: OpleSchema): Collection not nil =
  query.database.openCollection $schema

proc getReadableSchema*(query: OpleQuery, schema: OpleSchema): CollectionSnapshot {.inline.} =
  query.getSchema(schema).with(query.snapshot)

proc getWritableSchema*(query: OpleQuery, schema: OpleSchema): CollectionTransaction {.inline.} =
  query.getSchema(schema).with(query.transaction)

proc toCollectionRef*(collection: string): OpleRef =
  ## Convert a collection name into an OpleRef.
  var id, scope: string

  case collection
  of $ople_collections:
    id = "collections"
  of $ople_indexes:
    id = "indexes"
  else:
    id = collection
    scope = $ople_collections

  OpleRef(id: id, collection: scope)
