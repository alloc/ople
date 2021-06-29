import { OpleQuery } from '../query'

/**
 * Reads are compiled into `readAsync` calls in production.
 */
export function readAsync(query: OpleQuery, ...params: any[]): Promise<any> {
  // TODO
}

/**
 * Writes are compiled into `writeAsync` calls in production.
 */
export function writeAsync(query: OpleQuery, ...params: any[]): Promise<void> {
  // TODO
}
