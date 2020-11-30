declare const $E: unique symbol
declare const $T: unique symbol

export abstract class Record<
  Events extends object = any,
  T extends object = any
> {
  protected [$E]: Events
  protected [$T]: T
}
