import { auto, o, prepare, Ople, Signal } from 'ople'

class Router extends Ople {
  constructor() {
    super()
    prepare(this, Router)
  }
}

interface Router {
  readonly fullName: string
  onFocus: Signal<void>
  onBlur: Signal<void>
}

prepare(Router, self => {
  // Listen to self.
  self.onFocus(() => {})

  // Listen to new property values.
  auto(() => {
    self.thing.onStuff(() => {})
  })

  // Define a memoized getter.
  self.fullName = o(() => {
    return self.firstName + ' ' + self.lastName
  })
})
