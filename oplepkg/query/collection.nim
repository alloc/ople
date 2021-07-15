{.experimental: "notnil".}
import nimdbx
import ../error
import ../query

proc getCollection*(query: OpleQuery, name: string): Collection not nil =
  var col = query.database.openCollectionOrNil name
  if col == nil:
    query.fail "invalid ref", badCollectionRef name
  # HACK: this proves the result is non-nil
  if col == nil: query.database.openCollection name
  else: col

# TODO: create document in "ople_collections" collection
proc newCollection*(query: OpleQuery, name: string): Collection not nil =
  query.database.createCollection(name)
