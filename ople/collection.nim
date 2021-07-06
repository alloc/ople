import macros
import nimdbx
import ./query
import ./error

proc toCollection*(r: OpleRef, query: OpleQuery): Collection =
  result = query.database.openCollectionOrNil r.collection
  if result == nil:
    query.fail "invalid ref", badCollectionRef r.collection

macro toCollection*(r: OpleRef): untyped =
  newCall(newIdentNode("toCollection"), r, newIdentNode("query"))
