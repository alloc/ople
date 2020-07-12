## Mixins

Mixins are functions that attach state, event listeners, and reactions to the
`Ople` context in which they are called. Any function can be a mixin, just like
any function can be a React hook.

```js
export function mixin() {
  // TODO: mixin example
}

const state = createOple(() => {
  mixin()
})
```

Ople also provides a few mixin helpers.

### `setEffect`

The `setEffect` function lets you attach a disposable object to the current
Ople context, so the former is disposed of when the latter is, but not vice
versa.

You must provide an "owner" object as a cache key, in case you need the effect
disposed of *before* the Ople context is disposed.

```ts
import {setEffect} from 'ople'

function subscribe(source, effect) {
  let subscriber
  setEffect(source, active => {
    if (active) {
      subscriber = source.subscribe(effect)
    } else {
      subscriber.dispose()
    }
  })
}
```

Then, inside an Ople context, we can use our `subscribe` mixin.

```ts
// The `source` can be any object from your favorite library,
// assuming it has a `subscribe` method that returns a disposable.
const source = {}

const state = createOple((self, set, emit) => {
  subscribe(source, value => {
    console.log('Source changed:', value)
  })
})
```

### `setState`

The `setState` function is made for mixins that need to update state
by merging patch objects.

```ts
import {setState} from 'ople'

function makeUndoable() {
  // Expose state and/or methods
  setState({
    history: [],
    undo() {...},
    redo() {...},
  })
}
```

### `getOple` and `expectOple`

These functions are for accessing the current Ople context. Use `getOple`
if you want to check for `null` manually. Otherwise, use `expectOple` to
throw an error when no Ople context is active.

```ts
import {expectOple} from 'ople'

interface MixinState {
  foo: number
}

interface MixinEvents {
  bar(): void
}

function mixin() {
  const self = expectOple<MixinState, MixinEvents>()
  self.set({ foo: 0 })
  self.on('bar', () => {
    console.log('bar!')
  })
}
```
