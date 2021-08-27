import { callees, Caller } from './callees'

/**
 * Invoke a backend function.
 */
export async function invokeFunction(
  caller: Caller,
  calleeId: string,
  args?: any[] | null
) {
  const callee = callees[calleeId]
  if (callee) {
    if (callee.authorize && !(await callee.authorize(caller))) {
      // Unauthorized calls act like no such function exists.
      throw `Function does not exist: "${calleeId}"`
    }
    return await (args ? callee(caller, ...args) : callee(caller))
  } else {
    throw `Function does not exist: "${calleeId}"`
  }
}
