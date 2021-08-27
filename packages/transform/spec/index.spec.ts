import * as babel from '@babel/core'
import endent from 'endent'
import { babelOpleClient } from '../src'

function transform(code: string) {
  return babel.transformSync(endent(code as any), {
    plugins: [require('@babel/plugin-syntax-typescript'), babelOpleClient],
    sourceMaps: 'inline',
  })?.code
}

describe('Ople subclass', () => {
  test('with constructor and prepare method', () => {
    const output = transform(`
      import { auto, Ople } from '@ople/client'

      class Foo extends Ople {
        constructor(readonly foo: number) {
          super()
        }
        prepare() {
          auto(() => {
            console.log('foo:', this.foo)
          })
        }
      }
    `)

    console.log(output)
    // expect(output).toBe(null)
  })

  test('no prepare method', () => {
    const output = transform(`
      import { Ople } from '@ople/client'

      class Foo extends Ople {
        constructor(readonly foo: number) {
          super()
        }
      }
    `)

    console.log(output)
    // expect(output).toBe(null)
  })
})

describe('OpleRecord subclass', () => {
  test('with prepare method / no constructor', () => {
    const output = transform(`
      import { auto, OpleRecord } from '@ople/client'

      class Foo extends OpleRecord {
        prepare() {
          auto(() => {
            console.log('foo:', this.foo)
          })
        }
      }
    `)

    console.log(output)
    // expect(output).toBe(null)
  })

  test('no constructor or prepare method', () => {
    const output = transform(`
      import { OpleRecord } from '@ople/client'
  
      class Foo extends OpleRecord {
        foo = true
      }
    `)

    console.log(output)
    // expect(output).toBe(null)
  })
})
