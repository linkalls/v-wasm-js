# Core API

Reference for Vitrio core functions.

## `v(initial)`

Creates a reactive atom (state).

```tsx
const count = v(0)
const name = v('John')
const user = v({ id: 1, name: 'Alice' })
const items = v<string[]>([])
```

### Type

```tsx
function v<T>(initial: T): VAtom<T>
```

---

## `derive(fn)`

Creates a computed value derived from other atoms. It automatically re-computes when dependent atoms change.

```tsx
const count = v(10)
const doubled = derive(get => get(count) * 2)       // 20
const isEven = derive(get => get(count) % 2 === 0)  // true
```

Can depend on multiple atoms:

```tsx
const firstName = v('John')
const lastName = v('Doe')
const fullName = derive(get => `${get(firstName)} ${get(lastName)}`)
```

### Type

```tsx
function derive<T>(read: (get: Getter) => T): VAtom<T>
```

---

## `get(atom)`

Gets the current value of an atom.

```tsx
const count = v(5)
console.log(get(count))  // 5
```

When called within a **rendering context**, it automatically subscribes to changes:

```tsx
<span>{() => get(count)}</span>  // Automatically updates when count changes
```

---

## `set(atom, value)`

Updates the value of an atom.

```tsx
const count = v(0)

// Set value directly
set(count, 5)

// Update using previous value
set(count, prev => prev + 1)
```


---

## `batch(fn)`

Batches multiple `set()` calls and schedules subscribers once at the end of the batch.
Use this when updating multiple atoms in one user action to avoid unnecessary intermediate renders.

```tsx
batch(() => {
  set(firstName, 'Ada')
  set(lastName, 'Lovelace')
  set(isSaving, false)
})
```

### Type

```tsx
function batch<T>(fn: () => T): T
```

---

## `startTransition(fn)`

Schedules non-urgent updates asynchronously and runs them inside an implicit `batch`.
Useful for larger updates (filters, table transforms, route-level recalculations) without blocking urgent interactions.

```tsx
await startTransition(() => {
  set(filterAtom, "enterprise")
  set(sortAtom, "revenue")
})
```

### Type

```tsx
function startTransition<T>(fn: () => T): Promise<T>
```

---

## `subscribe(atom, callback)`

Subscribes to changes in an atom. Returns an unsubscribe function.

```tsx
const count = v(0)

const unsubscribe = subscribe(count, () => {
  console.log('Count changed:', get(count))
})

set(count, 1)  // "Count changed: 1"

unsubscribe()  // Unsubscribe
```

---

## `use(atom)`

Returns a `[value, setter]` tuple like React hooks.

```tsx
function Counter() {
  const [count, setCount] = use(countAtom)
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

---

## `render(component, container)`

Mounts a component to the DOM.

```tsx
const dispose = render(<App />, document.getElementById('app'))

// Unmount (cleanup)
dispose();
```

---

## Lifecycle & Effects

### `createEffect(fn)`

Creates a reactive side effect. Automatically re-runs when dependencies change. Automatically disposed when the component unmounts.

```tsx
createEffect(() => {
  console.log("Count is now", get(countAtom));

  // Cleanup function (called before next run or on disposal)
  return () => console.log("Cleaning up");
});
```

### `onCleanup(fn)`

Registers a callback to run when the current scope (component or effect) is disposed.

```tsx
onCleanup(() => {
  window.removeEventListener("resize", handleResize);
});
```

### `createRoot(fn)`

Creates a root scope that is not automatically disposed. Typically used internally by `render`, so users rarely need to use it directly.

```tsx
const dispose = createRoot((dispose) => {
  createEffect(() => ...);
  return dispose;
});
```
