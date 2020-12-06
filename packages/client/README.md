## Postponed

- document subscribers are notified about mutations by RPC handlers
- server-side queries in idiomatic TypeScript
- built-in Redis caching in RPC handlers
- RPC handlers have a REST api too?
- immutable snapshots (with React hook for subscribing)
- compile RPC handlers into their own cloud functions

## Unresolved

- persistence
- code-splitting
- scene-based reference counting

## Resolved

This section is about design choices that are ready to be implemented.

### Partials

A "partial" is created when mapping a ref from a query or RPC result.

Partials of the same ref are merged into a single observable object.
The server can send patches for the specific keys loaded by the client,
so unused patches are not sent, but the partial is never stale.

When a ref is materialized, the partial is graduated into a full
instance of the ref's class.

### Records

```ts
import { Record, Signal, prepare } from '@ople/client'
import { User } from './User'

class Todo extends Record {
  date = new Date()
  author = User.current
  constructor(public text: string) {
    super()
    prepare(this, Todo)
  }
}

// Transient properties are declared here.
// These are never saved to the database.
interface Todo {
  // Derived properties go here.
  isEmpty: boolean
  // Signal properties with names matching /^(on|did|will)[A-Z]/ are
  // initialized by each instance on-demand.
  didComplete: Signal<void>
}

prepare(Todo, (todo, set) => {
  // Define a lazily derived property.
  set('isEmpty', () => todo.text.length == 0)
  // Define a reaction.
  auto(() => console.log(todo.text))
  // Define an event handler.
  todo.author.onDelete(() => todo.delete())
})
```

Records have these properties:

- `isModified: boolean`
- `lastSyncTime: FaunaTime | null`

Records have these methods:

- `save(): Promise<void>`
- `sync(): Promise<void>`
- `delete(): Promise<void>`
- Ople methods
  - `set(values: object): void`
  - `set(key: string, value: any): void`
  - `dispose(): void`

Records have these signals:

- `onSave` (This record will be saved. Handlers receive the `save` promise.)
- `onSync` (This record will be synchronized. Handlers receive the `sync` promise.)
- `onDelete` (This record will be deleted. Handlers receive the `delete` promise.)

These signals are sent by their collections, too.

#### Server-sent events

On the backend, refs have signals that can be passed to `emit` to notify
document subscribers.

### Collections

Collections are declared by the client. At build time, the client is parsed
and searched for `new Collection` calls, whose binding name and index config
is copied into a JSON file for bootstrapping purposes. The parsed calls are
also used to generate server-based `Collection` instances, which are used to
define access control, respond to mutation events, and query the database
from RPC handlers.

```ts
const todos = new Collection<Todo>()
```

#### Method examples

```ts
todos.get(ref) // => Query<Todo>
todos.cache.get(ref) // => Todo | null

todos.sortBy('date') // => Query<Todo[]>
todos.where({ done: true }) // => Query<Todo[]>
todos.where(todo => todo('assigned').has(todo.author)) // => Query<Todo[]>
```

#### Mutation events

On the server-side, collections have mutation events.

```ts
// Receives the document and who created it.
todos.onCreate((todo, user) => {})

// Receives the ref, what changed, and who did it.
todos.onChange((ref, change, user) => {})

// Receives the document and who deleted it.
todos.onDelete((todo, user) => {})

// Access control works like this:
todos.canRead((ref: Ref, props: Set<string>, user: Ref) => true)
todos.canCreate((todo: object, user: Ref) => true)
todos.canChange((ref: Ref, change: Change, user: Ref) => true)
todos.canDelete((todo: object, user: Ref) => true)
```

### Queries

```ts
// "todos" is a local collection of Todo records
import { todos } from 'todos'

// Create a query whose results are cached in the "todos" collection.
// Queries are thenables which can manipulate results before awaiting them.
const completed = todos.where({ done: true })

// Get all matching refs
await completed

// Get all matching records
await completed.map(todo => todo())

// Select specific fields
await completed.map(todo => todo.only('id', 'text'))

// Omit specific fields
await completed.map(todo => todo.omit('notes'))

// Transform the results
await completed.map(todo =>
  todo.merge({
    author: todo('author')
      .only('name', 'avatar')
      .merge({
        todos: todos
          .where({ author: todo.author })
          .sortBy({ date: 'newer' })
          .limit(10),
      }),
    assigned: todo('assigned').map(user => user.only('name', 'avatar')),
  })
)

// Filter the results
const selfAssigned = await completed.filter(todo => {
  return todo('assigned').has(todo.author)
})

// Paginated query
await completed.after(id).limit(10)
```

- Queries are executed in the next microtask, unless they both have a parent query
  and never had their `then` method called. Calling their `then` method after the
  next microtask will execute the query if never executed.
- The same `Query` can be both executed alone and used by multiple other queries,
  since it will be "cloned" by its parent queries.
- Refs are included in results even when `pick` is used.
- RPC calls return a query and can take queries as arguments.

### @ople/babel-plugin-transform-prepare

Babel plugin that inserts `prepare` call into class constructor
when that class is passed to `prepare` somewhere in the module.
