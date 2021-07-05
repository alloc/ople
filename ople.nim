{.experimental: "notnil".}
import napibindings
import nimdbx
import streams
import ./ople/data/from_json
import ./ople/data/to_napi
import ./ople/eval
import ./ople/query

var db {.noinit.}: Database

var SnapshotMethods {.noinit.}: napi_value
var TransactionMethods {.noinit.}: napi_value

proc toSnapshot(this: napi_value): auto =
  cast[Snapshot](this["handle"].getExternal)

proc toTransaction(this: napi_value): auto =
  cast[Transaction](this["handle"].getExternal)

init proc(exports: Module) =

  fn(1, execSync):
    let queryStr = args[0].getStr
    let queryExpr = parseOpleData newStringStream(queryStr)
    var query = newQuery(queryExpr, db)
    let snapshot = this.toSnapshot
    query.snapshot = snapshot
    if snapshot of Transaction:
      query.transaction = cast[Transaction](snapshot)
    return \query.eval()

  fn(0, finishSnapshot):
    this.toSnapshot.finish()
    return nil

  SnapshotMethods = \{
    "execSync": execSync,
    "finish": finishSnapshot,
  }

  fn(0, commitTransaction):
    this.toTransaction.commit()
    return nil

  TransactionMethods = \{
    "commit": commitTransaction,
    "__proto__": SnapshotMethods,
  }

  exports.registerFn(1, "open"):
    db = openDatabase(args[0].getStr)
    return undefined()

  exports.registerFn(0, "beginSnapshot"):
    let snapshot = db.beginSnapshot()
    GC_ref(snapshot)
    return \{
      "__proto__": SnapshotMethods,
      "handle": createExternal(
        cast[pointer](snapshot),
        proc (data: pointer) =
          GC_unref(snapshot)
      ),
    }

  exports.registerFn(0, "beginTransaction"):
    let transaction = db.beginTransaction()
    GC_ref(transaction)
    return \{
      "__proto__": TransactionMethods,
      "handle": createExternal(
        cast[pointer](transaction),
        proc (data: pointer) =
          GC_unref(transaction)
      ),
    }
