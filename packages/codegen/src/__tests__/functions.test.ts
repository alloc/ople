import path from 'path'
import endent from 'endent'
import { ts, Project } from 'ts-morph'
import { parseFunctions } from '../parsers/functions'

test('basic example', () => {
  const project = new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      types: [],
    },
  })
  const source = project.createSourceFile(
    'functions.ts',
    endent`
      interface User {
        name: string
      }
      /** One line description */
      function a(): void
      /** 
       * Two line
       * description 
       */
      function a(n: number): void
      function a(n) {}
      exposeFunction(a)
      exposeFunction(
        function b(user: User) {}
      )
      exposeFunctions({ 
        c: () => {},
      })
      function f<T>(...args: T[]): T[] {}
      exposeFunctions({ f, x: f })
      exposeFunctions({
        login() {}
      })
    `
  )

  const functions = parseFunctions(source)
  console.log(functions)
})
