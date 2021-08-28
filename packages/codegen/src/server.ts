import endent from 'endent'

export function generateServer({
  imports,
  port,
}: {
  imports: string[]
  port: number
}) {
  return endent`
    import { env, serve, makeOriginContext } from "@ople/backend"
    Object.assign(global, env)

    ${imports.map(path => `import "${path}"`).join(`\n`)}

    serve({
      port: ${port},
      context: global.opleContext,
    })
  `
}
