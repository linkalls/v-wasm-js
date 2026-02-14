# Store

Vitrio provides `createStore` for handling complex, nested state with fine-grained reactivity. It uses Proxies to track dependencies automatically.

## Usage

```tsx
import { createStore } from '@potetotown/vitrio';

const [state, setState] = createStore({
  user: {
    name: "John",
    settings: {
      theme: "dark"
    }
  },
  todos: []
});

// Reading state tracks dependencies
function UserProfile() {
  return <div>{() => state.user.name}</div>;
}

// Updating state
setState(s => {
  s.user.name = "Jane"; // Fine-grained update
});
```

## API

### `createStore<T>(initialState: T)`

Creates a reactive store.

- **Returns:** `[state, setState]`
- `state`: A readonly proxy object. Accessing properties tracks dependencies.
- `setState`: A function to update the store. It accepts a callback `(state) => void` where you can mutate the state directly. The mutations are intercepted and trigger fine-grained updates.
