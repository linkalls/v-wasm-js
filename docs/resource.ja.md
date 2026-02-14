# Resource

Vitrioは、非同期データフェッチを管理するための `createResource` を提供しており、REST や GraphQL 呼び出しに最適です。

## 使い方

```tsx
import { createResource } from '@potetotown/vitrio';

// 1. フェッチャー関数
const fetchUser = async (id: number) => {
  const response = await fetch(`/api/user/${id}`);
  return response.json();
};

// 2. リアクティブなリソースを作成
// source (id) はリアクティブです。変更されると fetchUser が再実行されます。
const [userId, setUserId] = v(1);
const user = createResource(userId, fetchUser);

// 3. データの読み取り
function UserProfile() {
  return (
    <div>
      <Show when={user.loading}>
        <p>読み込み中...</p>
      </Show>

      <Show when={user.error}>
        <p>エラー: {user.error}</p>
      </Show>

      <Show when={user()}>
        {() => <p>名前: {user()!.name}</p>}
      </Show>
    </div>
  );
}
```

## API

### `createResource<T, S>(source: S | (() => S), fetcher: (s: S, info: { signal }) => Promise<T>)`

source が変更されたときにデータをフェッチするリソースを作成します。

- **戻り値:** プロパティを持つリソースゲッター関数 `() => T | undefined`:
  - `loading()`: boolean
  - `error()`: any
  - `refetch()`: 手動でフェッチをトリガー
  - `mutate(val)`: ローカルデータを楽観的に更新
