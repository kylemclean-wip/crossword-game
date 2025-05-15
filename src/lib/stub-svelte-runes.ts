function identity<T>(value: T) {
  return value;
}
globalThis.$state = identity as typeof $state;
globalThis.$state.raw = identity as typeof $state.raw;
