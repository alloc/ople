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

### Collections

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
    author: todo('author').only('name', 'avatar').merge({
      todos: todos.where({ author: todo.author }).sortBy({ date: 'newer' }).limit(10),
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
