import napibindings
import sequtils
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

proc prepareCallbacks(map: napi_value): OpleCallbacks =
  result = newTable[string, OpleCallback]()
  let callbacks = result
  for key, value in map:
    let fn = value.getFun
    result[key] = proc (args: varargs[OpleData]): OpleData =
      let ret = fn args.mapIt(napiCreate(it.stringify))
      parseOpleData(ret.getStr, callbacks)

init proc(exports: Module) =

  fn(1, execSync):
    let callbacks = prepareCallbacks args[1]
    let queryExprStr = args[0].getStr
    let queryExpr = parseOpleData(queryExprStr, callbacks)
    let query = newQuery(queryExpr, callbacks, db, this.snapshot, this.now)
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
