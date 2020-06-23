export function setHidden(self: object, key: keyof any, value: any) {
  Object.defineProperty(self, key, { value, writable: true })
}
