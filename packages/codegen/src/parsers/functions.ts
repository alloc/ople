import {
  ts,
  FunctionExpression,
  Identifier,
  MethodDeclaration,
  Node,
  PropertyAssignment,
  ShorthandPropertyAssignment,
  Signature,
  SourceFile,
  Type,
} from 'ts-morph'
import { findReferencedTypes } from '../common'

export type OpleFunction = {
  name: string
  signature: string[]
  referencedTypes: Set<Node>
  file: SourceFile
}

export function parseFunctions(file: SourceFile) {
  const nodes = findExposedFunctions(file)
  const signs = extractSignatures(nodes)
  return Object.keys(signs).map(
    (name): OpleFunction => ({
      name,
      signature: signs[name].map(sign => printSignature(sign, name)),
      referencedTypes: getReferencedTypes(signs[name]),
      file,
    })
  )
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
  const exposedFunctions: ExposedFunction[] = []
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
      if (callee == 'exposeFunction') {
        const [arg] = callNode.getArguments()
        if (Node.isIdentifier(arg)) {
          exposedFunctions.push(arg)
        } else if (Node.isFunctionExpression(arg)) {
          const nameNode = arg.getNameNode()
          if (nameNode) {
            exposedFunctions.push(arg)
          } else {
            // TODO: warn with node location
          }
        } else {
          // TODO: warn with node location
        }
      } else if (callee == 'exposeFunctions') {
        const [arg] = callNode.getArguments()
        if (Node.isObjectLiteralExpression(arg)) {
          for (const prop of arg.getProperties()) {
            if (
              Node.isMethodDeclaration(prop) ||
              Node.isPropertyAssignment(prop) ||
              Node.isShorthandPropertyAssignment(prop)
            ) {
              exposedFunctions.push(prop)
            } else {
              // TODO: warn with node location
            }
          }
        } else {
          // TODO: warn with node location
        }
      }
    }
  })
  return exposedFunctions
}

export type SignatureMap = Record<string, Signature[]>

export function extractSignatures(nodes: ExposedFunction[]) {
  const signatureMap: SignatureMap = {}
  for (const node of nodes) {
    let name: string | undefined
    let signatures: Signature[] | undefined
    if (Node.isIdentifier(node)) {
      name = node.getText()
      signatures = findSignatures(node)
    } else if (
      Node.isNamedNode(node) ||
      Node.isNameableNode(node) ||
      Node.isPropertyNamedNode(node)
    ) {
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
      signatureMap[name] = signatures
    }
  }
  return signatureMap
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

function printSignature(sign: Signature, name = '') {
  const decl = sign.getDeclaration()
  if (!Node.isParameteredNode(decl)) {
    throw Error('Signature must be from a parametered node')
  }

  const getText = (node: Node | Type) =>
    node instanceof Type
      ? node.getText(decl, ts.TypeFormatFlags.UseFullyQualifiedType)
      : node.getText()

  const params = decl.getParameters().map(getText).join(', ')
  const returnType = getText(decl.getReturnType())
  const typeParams = sign.getTypeParameters().map(getText).join(', ')

  const [docs] = sign.getDocumentationComments()

  return (
    (docs ? `/**${docs.getText().replace(/(^|\n)/g, `\n * `)}\n */\n` : ``) +
    name +
    (typeParams.length ? `<${typeParams}>` : ``) +
    `(${params}): ${returnType}`
  )
}