export type SelectionIdentity =
  | { kind: "narrative"; id: string }
  | { kind: "astronomy"; id: string }
  | { kind: "chapter"; id: string };
