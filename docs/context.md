# Context

Vitrio provides a Context API for passing data through the component tree without prop drilling.

## Usage

Thanks to Vitrio's lazy component evaluation, you can use Context naturally like in React.

```tsx
import { createContext, useContext } from '@potetotown/vitrio';

// 1. Create Context
const ThemeContext = createContext("light");

// 2. Use Provider
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <ThemedButton />
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
  - `children`: VNode(s) or Component(s).
