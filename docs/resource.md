# Resource

Vitrio provides `createResource` for managing async data fetching, perfect for REST or GraphQL calls.

## Usage

```tsx
import { createResource } from '@potetotown/vitrio';

// 1. Fetcher function
const fetchUser = async (id: number) => {
  const response = await fetch(`/api/user/${id}`);
  return response.json();
};

// 2. Create reactive resource
// source (id) is reactive. When it changes, fetchUser re-runs.
const [userId, setUserId] = v(1);
const user = createResource(userId, fetchUser);

// 3. Read data
function UserProfile() {
  return (
    <div>
      <Show when={user.loading}>
        <p>Loading...</p>
      </Show>

      <Show when={user.error}>
        <p>Error: {user.error}</p>
      </Show>

      <Show when={user()}>
        {() => <p>Name: {user()!.name}</p>}
      </Show>
    </div>
  );
}
```

## API

### `createResource<T, S>(source: S | (() => S), fetcher: (s: S, info: { signal }) => Promise<T>)`

Creates a resource that fetches data when source changes.

- **Returns:** Resource getter function `() => T | undefined` with properties:
  - `loading()`: boolean
  - `error()`: any
  - `refetch()`: Manually trigger fetch
  - `mutate(val)`: Optimistically update local data
