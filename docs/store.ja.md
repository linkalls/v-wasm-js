# Store

Vitrioは、複雑でネストされた状態を細粒度のリアクティビティで扱うための `createStore` を提供します。これはProxyを使用して自動的に依存関係を追跡します。

## 使い方

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

// 状態の読み取りは依存関係を追跡します
function UserProfile() {
  return <div>{() => state.user.name}</div>;
}

// 状態の更新
setState(s => {
  s.user.name = "Jane"; // 細粒度の更新
});
```

## API

### `createStore<T>(initialState: T)`

リアクティブなストアを作成します。

- **戻り値:** `[state, setState]`
- `state`: 読み取り専用のプロキシオブジェクト。プロパティへのアクセスは依存関係を追跡します。
- `setState`: ストアを更新する関数。コールバック `(state) => void` を受け取り、その中で状態を直接変更できます。変更はインターセプトされ、細粒度の更新をトリガーします。
