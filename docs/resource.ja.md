# Resource

Vitrio の `createResource` は、REST / GraphQL などの非同期データ取得を管理します。

## 使い方

```tsx
import { createResource, v, get, Show } from '@potetotown/vitrio';

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

- `source`: 値または関数。値が変わると再取得。
- `fetcher(source, { signal })`: AbortSignal 付き非同期ローダー。
- `options`:
  - `initialValue?: T`
  - `retries?: number`
  - `retryDelayMs?: number | ((attempt, error) => number)`
  - `onError?: (error, attempt) => void`

**戻り値**: `() => T | undefined` に加えて以下を持つ関数:
- `loading()`
- `error()`
- `refetch()`
- `mutate(val)`
- `state`（内部 atom）
