# ople

[![npm](https://img.shields.io/npm/v/ople.svg)](https://www.npmjs.com/package/ople)
[![Build status](https://travis-ci.org/alloc/ople.svg?branch=master)](https://travis-ci.org/alloc/ople)
[![codecov](https://codecov.io/gh/alloc/ople/branch/master/graph/badge.svg)](https://codecov.io/gh/alloc/ople)
[![Bundle size](https://badgen.net/bundlephobia/min/ople)](https://bundlephobia.com/result?p=ople)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

Event-driven, observable data flow for React 💥👀

&nbsp;

## Usage

The `createOple` function constructs an Ople object, which is both observable
and readonly to React components. Expose methods for React components to call, 
and expose events for React components to subscribe to.

```
TODO: document the "createOple" function
```

&nbsp;

### Classes

There are two ways to declare an `Ople` subclass.

Pick whichever you prefer!

&nbsp;

#### `createClass`

Classes made by `createClass` meet the following criteria:

- extends the `Ople` class for event emitting and disposable effects
- requires the `new` keyword to be constructed
- can be extended

```ts
import {createClass, auto} from 'ople'

// Declare your props in TodoProps
interface TodoProps {
  content: string
}

// Declare your state and methods in TodoState
interface TodoState {
  id: string
  done: boolean
  content: string
}

// Declare your events in TodoEvents
interface TodoEvents {
  complete(): void
}

let nextId = 1

export const Todo = createClass<TodoState, TodoEvents, [TodoProps]>(
  'Todo',
  props => (todo, set, emit) => {
    set(props)
    set({
      id: nextId++,
      done: false,
    })
    auto(() =>
      todo.done && emit('complete')
    )
  }
)

// The type for `Todo` is declared like so:
import {ReadonlyOpleObject} from 'ople'
export interface Todo extends ReadonlyOpleObject<TodoState, TodoEvents> {}
```

&nbsp;

#### `extends Ople`

The `Ople` class can be extended by any class. This makes your class compatible with
Ople mixins, and it can even emit its own events.

The `initOple` function lets your class create reactions and event listeners with 
automatic disposal. If you create an Ople object inside `initOple`'s callback,
it will be attached to the Ople context, which means the attached Ople object will
have its `dispose` method called when the Ople context is disposed.

```ts
import {Ople, initOple, auto} from 'ople'

// Declare your props in TodoProps
interface TodoProps {
  content: string
}

// Declare your events in TodoEvents
interface TodoEvents {
  complete(): void
}

let nextId = 1

class Todo extends Ople<TodoEvents> {
  id = nextId++
  done = false
  content!: string // The `!` is required to avoid `this.content = props.content` syntax
  
  constructor(props: TodoProps) {
    super()
    
    // // This line is not needed, because of our `set(props)` call
    // this.content = props.content
    
    // Use the `initOple` function to set the Ople context, which
    // handles the disposal of any listeners or reactions created
    // inside the callback.
    initOple(this, (self, set, emit) => {
      // Merge the `props` object into `this`
      set(props)
      
      // Create a reactive callback
      auto(() => self.done && emit('complete'))
      
      // Attach listeners to `self` (or any other Ople object)
      self.on({
        complete() {
          console.log('Todo completed:', self)
        },
      })
    })
  }
  
  toggleDone() {
    this.done = !this.done
  }
}

const todo = new Todo({ content: 'Hello world' })

// BAD: Ople objects are readonly outside their initializer.
todo.done = true

// GOOD: Exposing a method is best practice.
todo.toggleDone()
```

&nbsp;

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
