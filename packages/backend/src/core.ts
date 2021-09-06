import { db, OpleRef, OpleTime, read, write } from 'ople-db'
import { Callee } from './callees'
import { invokeFunction } from './invoke'
import { OplePager } from './pager'

type PullMap = Record<string, number>
type PullResult = [OpleRef, OpleTime, object]
type PatchMap = Record<string, Record<string, any>>
type CreatePayload = [collection: string, data: object][]

// TODO: add hard limits to array lengths
export const coreFunctions: Record<string, Callee | undefined> = {
  async '@get'(_caller, refs: OpleRef[]) {
    // TODO: run "canRead" hook
    return read(() => refs.map(db.get))
  },
  async '@create'(_caller, payload: CreatePayload) {
    const created: [OpleRef, OpleTime][] = []
    for (const [collection, data] of payload) {
      // TODO: run "canWrite" hook
      const document = write(() => db.getCollection(collection).create(data))
      if (document) {
        created.push([document.ref, document.ts])
      }
    }
    return created
  },
  async '@push'(_caller, payload: PatchMap) {
    throw Error('not implemented')
    // TODO: run "canWrite" hook
    // TODO: validate the patches with `zod`
    // TODO: split patches into two groups (valid and invalid)
    // TODO: notify relevant channels
    // TODO: run "onUpdate" hook
  },
  async '@pull'(_caller, payload: PullMap) {
    const refs = Object.keys(payload).map(OpleRef.from)
    // TODO: run "canRead" hook
    return read(() =>
      refs.map(ref => {
        const { data, ts } = db.get(ref)
        return [ref, ts, data]
      })
    )
  },
  async '@delete'(_caller, refs: OpleRef[]) {
    // TODO: run "canWrite" hook
    // write(() => {
    //   refs.forEach(ref => {
    //     db.delete(ref)
    //   })
    // })
  },
  async '@watch'(caller, refs: OpleRef[]) {
    for (const ref of refs) {
      // TODO: check if access is allowed!
      caller.context.subscribe(caller.id, 'r:' + ref.toString())
    }
  },
  async '@unwatch'(caller, refs: OpleRef[]) {
    for (const ref of refs) {
      caller.context.unsubscribe(caller.id, 'r:' + ref.toString())
    }
  },
  async '@page'(caller, [calleeId, args]: [string, any[]]) {
    const pager: OplePager = await invokeFunction(caller, calleeId, args)
    return pager.page
  },
}
