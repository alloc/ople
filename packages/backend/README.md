```ts
import { DataStream, OpleDocument, OpleSet } from '@ople/backend'

type Props = {}

// Stream the list of collections.
const CollectionStream = new DataStream({
  name: 'collections',
  eval(props: Props, meta): OpleSet<OpleDocument> {
    /**
     * This is evaluated inside a read query.
     *
     * Both `props` and `meta` are proxies that track property access,
     * which is then used to generate a hash.
     *
     * You must return an OpleSet.
     */
  },
  // Instance methods build upon the initial OpleSet.
  toRefs() {
    return this.map(doc => doc.ref)
  },
})

const stream = new CollectionStream()

// Call an instance method.
stream.toRefs()
// => OpleSet<OpleRef>

// Every stream has a `paginate` method for controlling pagination.
stream.paginate({
  // Return all results when the stream is opened.
  size: Infinity,
})
```
