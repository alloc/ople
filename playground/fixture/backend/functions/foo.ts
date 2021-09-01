function foo() {
  console.log('foo was called')
  emit(global).onFoo({ foo: { bar: {} } })
}

exposeFunction(foo)
