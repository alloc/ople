import { Node } from 'ts-morph'
import path from 'path'
import fs from 'fs'

export function findReferencedTypes(node: Node, referencedTypes: Set<Node>) {
  node.forEachDescendant(node => {
    if (Node.isTypeReferenceNode(node)) {
      for (const def of getDefinitions(node.getTypeName())) {
        const decl = def.getDeclarationNode()
        if (decl) {
          referencedTypes.add(decl)
        }
      }
    }
  })
}

export function getDefinitions(node: Node) {
  return node.getProject().getLanguageService().getDefinitions(node)
}

export function resolveTypeImport(id: string, resolve: (id: string) => string) {
  let resolved = resolve(id)
  if (resolved.endsWith('.ts')) {
    return resolved
  }
  resolved = resolved.replace(/\.js$/, '.d.ts')
  if (fs.existsSync(resolved)) {
    return resolved
  }
  resolved = resolve(`@types/${id}/package.json`)
  const pkg = require(resolved)
  return path.resolve(resolved, '..', pkg.types || pkg.typings || 'index.d.ts')
}
