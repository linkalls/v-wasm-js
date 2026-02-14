# Context

Vitrio provides a Context API for passing data through the component tree without prop drilling.

## Usage

**Crucial Note:** Since Vitrio components execute immediately, you must wrap the children of a `Provider` in a function if you want the context to be available during their execution (e.g., when calling `useContext`).

```tsx
import { createContext, useContext } from '@potetotown/vitrio';

// 1. Create Context
const ThemeContext = createContext("light");

// 2. Use Provider
function App() {
  return (
    <ThemeContext.Provider value="dark">
      {/* ⚠️ Important: Wrap children in a function */}
      {() => (
        <ThemedButton />
      )}
    </ThemeContext.Provider>
  );
}

// 3. Consume Context
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button class={theme}>I am {theme}</button>;
}
```

## API

### `createContext<T>(defaultValue: T)`

Creates a context object with a default value.

- **Returns:** `{ Provider, id, defaultValue }`

### `useContext<T>(context: Context<T>)`

Reads the current value of the context. Must be called inside a component or hook executed within a `Provider`.

### `<Provider value={T}>`

Provides a value to its children.

- **Props:**
  - `value`: The value to provide.
  - `children`: A function returning the children (recommended) or VNodes.
