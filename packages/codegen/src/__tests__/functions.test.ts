import path from 'path'
import endent from 'endent'
import { ts, Project } from 'ts-morph'
import {
  extractSignatures,
  findExposedFunctions,
  printSignatures,
} from '../functions'

test('basic example', () => {
  const project = new Project({
    compilerOptions: {
      types: [],
      target: ts.ScriptTarget.ESNext,
      skipDefaultLibCheck: true,
      // tsBuildInfoFile: path.resolve(__dirname, '.tsbuildinfo'),
      // incremental: true,
    },
  })
  const source = project.createSourceFile(
    'functions.ts',
    endent`
      function a(): void
      function a(n: number): void
      function a(n) {}
      exposeFunction(a)
      exposeFunction(function b() {})
      exposeFunctions({ c: () => {} })
      function f<T>(...args: T[]): T[] {}
      exposeFunctions({ f, x: f })
      exposeFunctions({
        login() {}
      })
    `
  )

  const functions = findExposedFunctions(source)
  const signatures = extractSignatures(functions)
  expect(printSignatures(signatures)).toMatchInlineSnapshot(`
    "function a(): void
    function a(n: number): void
    function b(): void
    function c(): void
    function f<T>(...args: T[]): T[]
    function x<T>(...args: T[]): T[]
    function login(): void
    "
  `)
})
