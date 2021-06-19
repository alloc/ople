export function merge(a: any, b: any) {
  if (b === undefined) {
    return a
  }
  if (a && b && a.constructor == Object && b.constructor == Object) {
    for (const key in b) {
      a[key] = merge(a[key], b[key])
    }
    return a
  }
  return b
}
