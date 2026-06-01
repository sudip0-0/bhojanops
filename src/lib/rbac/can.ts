// Pure permission resolver — no I/O, easily unit-tested.
export function can(permissions: string[], key: string): boolean {
  return permissions.includes(key);
}

export function canAny(permissions: string[], keys: string[]): boolean {
  return keys.some((k) => permissions.includes(k));
}
