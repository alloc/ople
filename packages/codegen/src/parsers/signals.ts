import endent from 'endent'
import { Node, SourceFile } from 'ts-morph'
import { findReferencedTypes } from '../common'

export type OpleSignal = {
  name: string
  signature: string
  referencedTypes: Set<Node>
}

export function parseSignals(source: SourceFile) {
  const signalsNode = source.forEachChild(
    node =>
      Node.isInterfaceDeclaration(node) && node.getName() === 'Signals' && node
  )
  const signals: OpleSignal[] = []
  if (signalsNode) {
    if (signalsNode.isExported()) {
      for (const member of signalsNode.getMembers()) {
        if (!Node.isMethodSignature(member)) {
          // TODO: warn that only methods are allowed
          continue
        }

        const name = member.getName()
        const params = member.getParameters()
        const referencedTypes = new Set<Node>()

        params.forEach(node => {
          findReferencedTypes(node, referencedTypes)
        })

        const paramsText = params.map(param => param.getText())
        const firstParamType = params[0]?.getTypeNode()
        const targetType =
          firstParamType &&
          firstParamType.getText().match(/^OpleRef(?:|<(.+?)>)$/)?.[1]

        const [docs] = member.getJsDocs()
        const description = docs
          ? `/**${docs.getInnerText().replace(/(^|\n)/g, '\n * ')}\n */\n`
          : ``

        signals.push({
          name,
          signature:
            description +
            name +
            `(handler: (${paramsText.join(
              ', '
            )}) => boolean | void): OpleListener` +
            (targetType
              ? `\n` +
                name +
                `(target: ${targetType}, handler: (${paramsText
                  .slice(1)
                  .join(', ')}) => boolean | void): OpleListener`
              : ``),
          referencedTypes,
        })
      }
    } else {
      // TODO: warn that Signals should be exported
    }
  }
  return signals
}
