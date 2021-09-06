import {
  FunctionExpression,
  Identifier,
  MethodDeclaration,
  Node,
  PropertyAssignment,
  ShorthandPropertyAssignment,
  Signature,
  SourceFile,
} from 'ts-morph'
import { findReferencedTypes, isNamedNode } from '../common'
import { warn } from '../warnings'

export type OpleFunction = {
  name: string
  isPager?: boolean
  signatures: Signature[]
  referencedTypes: Set<Node>
  node: Node
  file: SourceFile
}

export function parseFunctions(file: SourceFile) {
  const functions: OpleFunction[] = []
  for (const { isPager, node } of findExposedFunctions(file)) {
    const [name, signatures] = extractSignatures(node)
    if (name)
      functions.push({
        name,
        isPager,
        signatures,
        referencedTypes: getReferencedTypes(signatures),
        node,
        file,
      })
  }
  return functions
}

function getReferencedTypes(signs: Signature[]) {
  const referencedTypes = new Set<Node>()
  signs.forEach(sign => {
    findReferencedTypes(sign.getDeclaration(), referencedTypes)
  })
  return referencedTypes
}

export type ExposedFunction =
  | Identifier
  | FunctionExpression
  | MethodDeclaration
  | PropertyAssignment
  | ShorthandPropertyAssignment

export function findExposedFunctions(source: SourceFile) {
  const exposedFunctions: { isPager?: boolean; node: ExposedFunction }[] = []
  source.forEachChild(stmt => {
    if (!Node.isExpressionStatement(stmt)) {
      return
    }
    const callNode = stmt.getExpression()
    if (!Node.isCallExpression(callNode)) {
      return
    }
    const calleeNode = callNode.getExpression()
    if (Node.isIdentifier(calleeNode)) {
      const callee = calleeNode.getText()
      if (/^expose(Function|Pager)$/.test(callee)) {
        const [arg] = callNode.getArguments()
        if (Node.isIdentifier(arg)) {
          exposedFunctions.push({
            isPager: /Pager/.test(callee),
            node: arg,
          })
        } else if (Node.isFunctionExpression(arg)) {
          const nameNode = arg.getNameNode()
          if (nameNode) {
            exposedFunctions.push({
              isPager: /Pager/.test(callee),
              node: arg,
            })
          } else {
            warn(arg, `Exposed function must be named`)
          }
        } else {
          warn(arg, `Unsupported node type: ${arg.getKindName()}`)
        }
      } else if (/^expose(Function|Pager)s$/.test(callee)) {
        const [arg] = callNode.getArguments()
        if (Node.isObjectLiteralExpression(arg)) {
          for (const prop of arg.getProperties()) {
            if (
              Node.isMethodDeclaration(prop) ||
              Node.isPropertyAssignment(prop) ||
              Node.isShorthandPropertyAssignment(prop)
            ) {
              exposedFunctions.push({
                isPager: /Pager/.test(callee),
                node: prop,
              })
            } else {
              warn(prop, `Unsupported node type: ${prop.getKindName()}`)
            }
          }
        } else {
          warn(arg, `Unsupported node type: ${arg.getKindName()}`)
        }
      }
    }
  })
  return exposedFunctions
}

export type SignatureMap = Record<string, Signature[]>

export function extractSignatures(node: ExposedFunction) {
  let name: string | undefined
  let signatures: Signature[] | undefined
  if (Node.isIdentifier(node)) {
    name = node.getText()
    signatures = findSignatures(node)
  } else if (isNamedNode(node)) {
    name = node.getName()
    if (Node.isFunctionExpression(node)) {
      signatures = [node.getSignature()]
    } else if (Node.isShorthandPropertyAssignment(node)) {
      signatures = findSignatures(node.getNameNode())
    } else if (Node.isMethodDeclaration(node)) {
      signatures = [node.getSignature()]
    } else if (Node.isPropertyAssignment(node)) {
      const init = node.getInitializer()
      if (Node.isSignaturedDeclaration(init)) {
        signatures = [init.getSignature()]
      } else if (Node.isIdentifier(init)) {
        signatures = findSignatures(init)
      }
    }
  }
  if (name && signatures?.length) {
    return [name, signatures] as const
  }
  return []
}

function findSignatures(ident: Identifier) {
  const [node] = ident.getDefinitionNodes()
  if (!Node.isFunctionDeclaration(node)) {
    return []
  }
  const overloads = node.getOverloads()
  return overloads.length
    ? overloads.map(overload => overload.getSignature())
    : [node.getSignature()]
}
