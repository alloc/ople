export class PutCache<T extends { toString(): string }> {
  private cache: Record<string, T> = Object.create(null)
  private counts: Record<string, number> = Object.create(null)

  get(key: string) {
    return this.cache[key]
  }

  take(key: string) {
    let value = this.cache[key]
    this.deleteKey(key)
    return value
  }

  put(value: T) {
    let key = value.toString()
    let count = this.counts[key] || 0
    this.counts[key] = count + 1
    this.cache[key] = value
  }

  delete(value: T) {
    return this.deleteKey(value.toString())
  }

  private deleteKey(key: string) {
    let count = this.counts[key] || 0
    if (count == 0) {
      return 0
    }
    if (--count == 0) {
      delete this.counts[key]
      delete this.cache[key]
    } else {
      this.counts[key] = count
    }
    return count
  }
}
