import endent from 'endent'
import { CallExpression, Node, SourceFile, TypeNode } from 'ts-morph'

// 1. Parse ople.init.ts for `openCollection` calls
// 2a. Assign type `any` for untyped `openCollection` calls
// 2b. Otherwise, parse the properties of the associated type that are compatible
//     with JSON and paste them into an interface exported by the generated client.
// 3. Expose the `db` object from "ople-db" as a global variable after casting it
//    to be a `Database<Collections>` type.

const reservedCollectionNames = ['events', 'set', 'self', 'documents', '_']

type CollectionTypes = Map<string, TypeNode | null>

export function findCollections(source: SourceFile) {
  const collections: CollectionTypes = new Map()
  source.forEachChild(node => {
    if (!Node.isExpressionStatement(node)) return
    const call = node.getExpression()

    if (!Node.isCallExpression(call)) return
    const callee = getCallee(call)

    if (callee === 'openCollection') {
      const [nameNode] = call.getArguments()
      if (!Node.isStringLiteral(nameNode)) {
        return // TODO: warn that string literal is required
      }
      const name = nameNode.getText()
      if (reservedCollectionNames.includes(name)) {
        return // TODO: warn about reserved name
      }
      const [documentType] = call.getTypeArguments()
      collections.set(name, documentType || null)
    }
  })
  return collections
}

function getCallee(call: CallExpression) {
  const calleeNode = call.getExpression()
  if (Node.isIdentifier(calleeNode)) {
    return calleeNode.getText()
  }
}

function generateDatabaseClient() {}

function printDocumentTypes(
  collectionTypes: CollectionTypes,
  sourceFile: SourceFile
) {
  const prelude: string[] = []
  const documentTypes: string[] = []
  for (const [collectionId, typeNode] of collectionTypes) {
    let documentType: string
    if (!typeNode) {
      documentType = 'Record<string, any>'
    } else {
      const symbol = typeNode.getSymbol()
      documentType = typeNode.getText()
      if (symbol && sourceFile !== typeNode.getSourceFile()) {
        const [decl] = symbol.getDeclarations()
        console.log(decl.getText())
      }
    }
    documentTypes.push(collectionId + ': ' + documentType)
  }
  return endent`
    ${prelude.join('\n')}${prelude.length ? '\n' : ''}
    declare module "ople-db" {
      export interface OpleDocuments {
        ${documentTypes.join('\n')}
      }
    }
  `
}
