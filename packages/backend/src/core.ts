import { db, OpleDocument, OpleRef, OpleTime, read, write } from 'ople-db'
import { Callee } from './callees'

type PullMap = Record<string, number>
type PullResult = [OpleRef, OpleTime, object]
type PatchMap = Record<string, Record<string, any>>
type CreatePayload = [collection: string, data: object][]

// TODO: add hard limits to array lengths
export const coreFunctions: Record<string, Callee> = {
  async '@get'(_caller, refs: OpleRef[]) {
    // TODO: run "canRead" hook
    return read(() => refs.map(db.get))
  },
  async '@create'(_caller, payload: CreatePayload) {
    const documents: OpleDocument[] = []
    for (const [collection, data] of payload) {
      // TODO: run "canWrite" hook
      const document = write(() => db.getCollection(collection).create(data))
      if (document) {
        documents.push(document)
      }
    }
    return documents
  },
  async '@push'(_caller, payload: PatchMap) {
    const rejected: PatchMap = {}
    // TODO: split patches into two groups (valid and invalid)
    // TODO: notify relevant channels
    // TODO: run "onUpdate" hook
    return rejected
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
    const rejected: OpleRef[] = []
    return rejected
  },
  async '@watch'(_caller, refs: OpleRef[], ts?: number) {
    // TODO: subscribe connection to relevant channels
    // TODO: return latest values after checking "If-Modified-Since" header
    const errors: string[] = []
    // TODO: check if access is allowed!
    if (true) {
    }
    return { errors }
  },
  async '@unwatch'(_caller, refs: OpleRef[]) {
    // TODO
  },
}
