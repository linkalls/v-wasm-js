# Getting Started

Let's start building reactive UIs with Vitrio.

## Installation

```bash
bun add @potetotown/vitrio
```

## Project Setup

### 1. tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@potetotown/vitrio",
    "moduleResolution": "bundler"
  }
}
```

### 2. index.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Vitrio App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

### 3. main.tsx

```tsx
import { v, derive, get, set, batch, startTransition, render } from '@potetotown/vitrio'

// Define state
const count = v(0)
const doubled = derive(get => get(count) * 2)

// Component
function App() {
  return (
    <div>
      <h1>Hello Vitrio!</h1>
      <p>Count: {() => get(count)}</p>
      <p>Doubled: {() => get(doubled)}</p>
      <button onClick={() => set(count, c => c + 1)}>
        Increment
      </button>
    </div>
  )
}

// Mount
render(<App />, document.getElementById('app'))
```


## Batching Updates

When a single action updates multiple atoms, wrap them in `batch()` to reduce intermediate updates.

```tsx
batch(() => {
  set(count, c => c + 1)
  set(message, 'Updated!')
})
```

## Deferred Updates

Use `startTransition` for non-urgent UI updates:

```tsx
await startTransition(() => {
  set(filter, "enterprise")
  set(sortBy, "revenue")
})
```

## Development Server

```bash
bun --hot main.tsx
```

## Next Steps

- [Core API](./api.md) - Detailed API reference
- [JSX & Components](./jsx.md) - How to write components
- [Control Flow](./control-flow.md) - Conditionals and Lists
