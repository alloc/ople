import { Ople, setup, prepare, onPrepare, Signal } from 'ople'

class Router extends Ople {
  constructor() {
    super()
    prepare()
  }
}

interface Router {
  onPrepare: Signal<void>
}

setup(Router, self => {
  onPrepare(() => {
    console.log(self)
  })

  auto(
    () => self.thing,
    thing => {
      // Listen to new property values.
      thing.onStuff(() => {...})
    }
  )
})
