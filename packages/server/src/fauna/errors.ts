import { errors, query as q, Expr } from 'faunadb'
import log from 'lodge'
import { db } from './client'

export type FaunaError = errors.FaunaError
export const FaunaError = errors.FaunaError

export type FaunaHTTPError = errors.FaunaHTTPError
export const FaunaHTTPError = errors.FaunaHTTPError

export async function printFaunaError(error: FaunaHTTPError) {
  let { requestContent: req, responseContent: res } = error.requestResult as any

  for (let e of res.errors) {
    try {
      const expr = new Expr({
        abort: JSON.parse(e.description),
      })
      log('\n' + log.red('Error:'), error.message + '\n')
      log(Expr.toString(expr).replace(/(^|\n)/g, '$1  '))
    } catch {
      const isCallError = error.message == 'call error'
      if (isCallError) {
        const expr = evalPosition(req, e.position)
        const fn = q.Function(expr.raw.call.raw.function)
        const query = (await db.query(q.Get(fn))).body
        req = createExpr(query.value)
        e = e.cause && e.cause[0]
      }

      const position = (e.failures && e.failures[0].field) || e.position
      if (!position) {
        log.error(error)
        return
      }

      let positionFound = false
      const findPosition = (keyPath: string[]) => {
        if (position.length != keyPath.length) {
          return false
        }
        for (let i = 0; i < keyPath.length; i++) {
          // HACK: Use loose comparison because string keys in FaunaHTTPError key paths
          //   might be number keys in Expr.toString
          if (position[i] != keyPath[i]) {
            return false
          }
        }
        positionFound = true
        return true
      }

      log('\n' + log.red('Error:'), e.description + '\n')
      log(
        Expr.toString(req, {
          map(str, keyPath) {
            return findPosition(keyPath) ? log.red(str) : str
          },
        }).replace(/(^|\n)/g, '$1  ')
      )
      if (!positionFound) {
        log('\n' + log.red('Error:'), 'Cannot find error position:', position)
        log.error(error)
      }
      log('')
    }
  }
}

/** Evaluate the `keyPath` on the `root` object */
function evalPosition(root: any, keyPath: string[]) {
  // Use JSON.parse to evaporate any Expr objects.
  let expr = root
  for (const key of keyPath) {
    expr = expr[key]
    if (expr instanceof Expr) {
      expr = (expr as any)['raw']
    }
  }
  return expr
}

function createExpr(arg: any) {
  if (!arg || typeof arg !== 'object' || arg instanceof Expr) {
    return arg
  }
  let raw: any
  if (Array.isArray(arg)) {
    raw = arg.map(createExpr)
  } else {
    raw = {}
    for (const key in arg) {
      raw[key] = createExpr(arg[key])
    }
  }
  return new Expr(raw)
}
