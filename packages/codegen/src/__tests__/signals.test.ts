import endent from 'endent'
import { ts, Project } from 'ts-morph'
import { parseSignals } from '../parsers/signals'

test('basic example', () => {
  const project = new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      types: [],
    },
  })
  const source = project.createSourceFile(
    'ople.init.ts',
    endent`
      interface User {
        name: string
      }

      type Foo = {}

      export interface Signals {
        /**
         * A user logged in.
         */
        onLogin(user: OpleRef<User>): void

        foo(props: {
          user1: User,
          user2: User,
          foo: Foo,
        }): void
      }
    `
  )

  expect(parseSignals(source).map(signal => signal.signature))
    .toMatchInlineSnapshot(`
    Array [
      "/**
    * A user logged in.
    */
    onLogin(user: User): void",
      "foo(props: { 
    user1: User,
    user2: User,
    foo: Foo,
    }): void",
    ]
  `)
})
