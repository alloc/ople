import { createClass, auto, OpleCreateFn, Ople, flushSync } from '../src'

describe('createClass', () => {
  it('creates a named constructor', () => {
    type State = { val: number; setVal(val: number): void }
    type Events = { change(val: number): void }

    const name = 'Test'
    const Test = createClass(
      name,
      (arg = 0): OpleCreateFn<State, Events> => (self, set, emit) => {
        set({ val: arg, setVal: val => set({ val }) })
        auto(() => emit('change', self.val))
      }
    )

    expect(Test.name).toBe(name)
    expect(Test.toString()).toMatchSnapshot()

    const test = new Test()
    expect(test instanceof Test).toBeTruthy()
    expect(test instanceof Ople).toBeTruthy()

    const str = test.toString()
    expect(str).toBe(new (class Test {})().toString())
    expect(str).toMatchInlineSnapshot('"[object Object]"')

    const onChange = jest.fn()
    test.on('change', onChange)
    test.setVal(1)
    flushSync()

    expect(onChange).toBeCalled()
    expect(onChange.mock.calls).toMatchSnapshot()
  })
})
