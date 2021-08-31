import endent from 'endent'

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
