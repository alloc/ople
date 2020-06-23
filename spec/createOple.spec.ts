import { createOple, auto, OpleSetFn, OpleEmitFn, setEffect } from '../src'
import { EventEmitter } from 'ee-ts'
import { flushSync } from 'wana'

describe('createOple', () => {
  describe('the set function', () => {
    it('updates the state', () => {
      const ople = createOple((state, set) => {
        expect(state.a).toBeUndefined()
        set({ a: 1 })
        expect(state.a).toBe(1)
      })
      expect(ople.a).toBe(1)
    })

    it('can be used in an event handler', () => {
      type State = { a: number; test(): void }
      const ople = createOple<State>((state, set, emit) => {
        set({
          a: 0,
          test: () => emit('test'),
        })
        state.on('test', () => {
          set({ a: 1 })
          expect(state.a).toBe(1)
        })
      })
      expect(ople.a).toBe(0)
      ople.test()
      expect(ople.a).toBe(1)
    })

    it('can define a computed getter', () => {
      type State = { a: number; b: number; set: OpleSetFn<State> }
      const ople = createOple<State>((state, set) => {
        set({
          a: 1,
          get b() {
            return state.a + 1
          },
          set,
        })
        expect(state.b).toBe(2)
      })
      expect(ople.b).toBe(2)
      ople.set({ a: 2 })
      expect(ople.b).toBe(3)
    })
  })

  describe('returned object', () => {
    it('is an event emitter', () => {
      type State = { emit: OpleEmitFn }
      const ople = createOple<State>((_state, set, emit) => {
        set({ emit })
      })
      expect(ople).toBeInstanceOf(EventEmitter)

      const onTest = jest.fn()
      ople.on('test', onTest)
      expect(onTest).not.toBeCalled()

      ople.emit('test', 1, 2)
      expect(onTest).toBeCalledWith(1, 2)
    })

    it('has observable properties', () => {
      type State = { a: number; set: OpleSetFn }
      const ople = createOple<State>((_state, set) => set({ a: 0, set }))
      const onCompute = jest.fn()

      auto(() => onCompute(ople.a))
      expect(onCompute).toBeCalledWith(0)

      ople.set({ a: 1 })
      flushSync()
      expect(onCompute).toBeCalledWith(1)
    })
  })
})
