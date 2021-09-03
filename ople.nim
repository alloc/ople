import napibindings
import streams
import times
import ./oplepkg/query/set
import ./oplepkg/data/[from_json,to_json,types]
import ./oplepkg/database
import ./oplepkg/eval

var db {.noinit.}: Database

var SnapshotMethods {.noinit.}: napi_ref
var TransactionMethods {.noinit.}: napi_ref

proc snapshot(this: napi_value): auto =
  cast[Snapshot](this["handle"].getExternal)

proc transaction(this: napi_value): auto =
  cast[Transaction](this["handle"].getExternal)

proc now(this: napi_value): auto =
  cast[ref Time](this["ts"].getExternal)[]

proc now(): ref Time =
  new(result)
  result[] = getTime()

proc napiCreate(data: OpleData): napi_value =
  napiCreate data.stringify()

init proc(exports: Module) =

  fn(1, execSync):
    let queryExprStr = args[0].getStr
    let queryExpr = parseOpleData newStringStream(queryExprStr)
    let query = newQuery(queryExpr, db, this.snapshot, this.now)
    let queryResult = query.eval()
    return napiCreate queryResult

  fn(0, finishSnapshot):
    this.snapshot.finish()
    return nil

  SnapshotMethods = toRef \{
    "execSync": execSync,
    "finish": finishSnapshot,
  }

  fn(0, finishTransaction):
    this.transaction.abort()
    return nil

  fn(0, commitTransaction):
    this.transaction.commit()
    return nil

  TransactionMethods = objectCreate(SnapshotMethods.fromRef, {
    "commit": commitTransaction,
  }).toRef

  exports.registerFn(1, "open"):
    let dbPath = args[0].getStr
    db = initDatabase dbPath
    return nil

  exports.registerFn(0, "beginSnapshot"):
    let snapshot = db.beginSnapshot()
    return objectCreate(SnapshotMethods.fromRef, {
      "handle": createExternalRef(snapshot),
      "ts": createExternalRef(now()),
    })

  exports.registerFn(0, "beginTransaction"):
    let transaction = db.beginTransaction()
    return objectCreate(TransactionMethods.fromRef, {
      "handle": createExternalRef(transaction),
      "ts": createExternalRef(now()),
    })

  # Iterating over an OpleSet using JavaScript is not really
  # possible if we don't integrate with N-API directly.
  exports.registerFn(0, "findDocument"):
    let id = args[0].getStr
    let filter = args[1].getFun
    let colRef = newOpleRef(id, $ople_collections)
    let documents = newOpleSet("get_documents", @[colRef])
    let query = newQuery(documents, db, this.snapshot, this.now)
    let queryResult = query.find(
      documents.set, 
      proc (doc: OpleData): bool =
        filter(napiCreate doc).getBool
    )
    return napiCreate queryResult
