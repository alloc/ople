import endent from 'endent'

export function generateServer({
  dev,
  port,
  imports,
}: {
  dev: boolean
  port: number
  imports: string[]
}) {
  const makeContext = dev ? `makeOriginContext` : `makePushpinContext`
  return endent`
    import { serve, ${makeContext} } from "@ople/backend"
    import "@ople/backend/global"

    ${imports.map(path => `import "${path}"`).join(`\n`)}

    ${
      dev
        ? endent`
          export default (config) =>
            serve({
              port: ${port},
              context: ${makeContext}(config),
            })`
        : endent`
          serve({
            port: ${port},
            context: ${makeContext}(),
          })`
    }
  `
}
