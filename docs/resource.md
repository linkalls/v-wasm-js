# Resource

Vitrio provides `createResource` for managing async data fetching, suitable for REST/GraphQL and production APIs.

## Usage

```tsx
import { createResource } from '@potetotown/vitrio';

const userId = v(1);

const user = createResource(
  () => get(userId),
  async (id, { signal }) => {
    const response = await fetch(`/api/user/${id}`, { signal });
    return response.json();
  },
  {
    retries: 2,
    retryDelayMs: (attempt) => attempt * 250,
  }
);

function UserProfile() {
  return (
    <div>
      <Show when={user.loading()}>
        <p>Loading...</p>
      </Show>

      <Show when={user.error()}>
        <p>Error: {String(user.error())}</p>
      </Show>

      <Show when={user()}>
        {() => <p>Name: {user()!.name}</p>}
      </Show>
    </div>
  );
}
```

## API

### `createResource(fetcher, options?)`
### `createResource(source, fetcher, options?)`

- `source`: value or function. When it changes, fetch is re-run.
- `fetcher(source, { signal })`: async data loader with abort signal.
- `options`:
  - `initialValue?: T`
  - `retries?: number`
  - `retryDelayMs?: number | ((attempt, error) => number)`
  - `onError?: (error, attempt) => void`

**Returns**: resource function `() => T | undefined` plus helpers:
- `loading()`
- `error()`
- `refetch()`
- `mutate(val)`
- `state` (underlying atom)
