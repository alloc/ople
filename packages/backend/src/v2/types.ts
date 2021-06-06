declare const api: OpleMethods & {
  extend(methods: OpleMethods): void
}

interface OpleMethods {
  [methodName: string]: OpleMethod
}

interface OpleMethod {}
