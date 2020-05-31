import { createOple, auto } from '../src'
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
      const ople = createOple((state, set) => {
        state.one('test', () => {
          set({ a: 1 })
          expect(state.a).toBe(1)
        })
      })
      expect(ople.a).toBeUndefined()
      ople.emit('test')
      expect(ople.a).toBe(1)
    })

    it('can define a computed getter', () => {
      const ople = createOple((state, set) => {
        set({
          a: 1,
          get b() {
            return state.a + 1
          },
        })
        expect(state.b).toBe(2)
      })
      expect(ople.b).toBe(2)
      ople.a = 2
      expect(ople.b).toBe(3)
    })
  })

  describe('returned object', () => {
    it('is an event emitter', () => {
      const ople = createOple(() => {})
      expect(ople).toBeInstanceOf(EventEmitter)

      const onTest = jest.fn()
      ople.one('test', onTest)
      expect(onTest).not.toBeCalled()

      ople.emit('test', 1, 2)
      expect(onTest).toBeCalledWith(1, 2)
    })

    it('has observable properties', () => {
      const ople = createOple(() => {})
      const onCompute = jest.fn()

      auto(() => onCompute(ople.a))
      expect(onCompute).toBeCalledWith(undefined)

      ople.a = true

      flushSync()
      expect(onCompute).toBeCalledWith(true)
    })
  })
})
