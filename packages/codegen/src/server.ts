import endent from 'endent'

export function generateServer({
  cwd,
  dev,
  port,
  imports,
  gripSecret,
}: {
  cwd: string
  dev: boolean
  port: number
  imports: string[]
  gripSecret: string
}) {
  const makeContext = dev ? `makeOriginContext` : `makePushpinContext`
  const serveOptions = endent`
    port: ${port},
    gripSecret: "${gripSecret}",
  `
  return endent`
    import { serve, ${makeContext} } from "@ople/backend"
    import "@ople/backend/global"

    process.chdir("${cwd}")
    require('dotenv').config()
    process.on("unhandledRejection", (e) => {
      console.error(e.stack)
    })

    ${imports.map(path => `import "${path}"`).join(`\n`)}

    ${
      dev
        ? endent`
          export default (config) =>
            serve({
              context: ${makeContext}(config),
              ${serveOptions}
            })`
        : endent`
          serve({
            context: ${makeContext}(),
            ${serveOptions}
          })`
    }
  `
}
