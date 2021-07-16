import napibindings
import streams
import times
import ./oplepkg/data/[from_json,to_json]
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

init proc(exports: Module) =

  fn(1, execSync):
    let queryExprStr = args[0].getStr
    let queryExpr = parseOpleData newStringStream(queryExprStr)
    let query = newQuery(queryExpr, db, this.snapshot, this.now)
    let queryResult = query.eval()
    let queryResultStr = queryResult.stringify()
    return napiCreate queryResultStr

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
    db = initDatabase args[0].getStr
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
