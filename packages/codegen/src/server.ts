import endent from 'endent'

export function generateServer({
  dev,
  port,
  imports,
  gripSecret,
}: {
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
