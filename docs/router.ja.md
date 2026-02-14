# Router

Vitrioは、シンプルなHistory APIベースのクライアントサイドルーターを提供します。

## 使い方

```tsx
import { Router, Route, A, location } from '@potetotown/vitrio';

// 1. アプリをRouterでラップ
function App() {
  return (
    <Router>
      <header>
        <A href="/">ホーム</A> | <A href="/about">概要</A>
      </header>

      {/* 2. ルートの定義 */}
      <Route path="/">
        <Home />
      </Route>
      <Route path="/about">
        <About />
      </Route>
      <Route path="/users/*">
        <Users />
      </Route>
    </Router>
  );
}

// 3. ナビゲーション
function Login() {
  const navigate = () => {
    // プログラムによる遷移
    navigate("/dashboard");
  };
  return <button onClick={navigate}>ログイン</button>;
}
```

## API

### `<Router>`
ヒストリーリスナーを設定します。

### `<Route path="path">`
`path` が `location.path` に一致する場合に子要素を条件付きでレンダリングします。
- **Props:**
  - `path`: 完全一致、またはワイルドカードとして `*` を使用（例: `/users/*`）。

### `<A href="url">`
完全なページリロードなしでナビゲーションに `pushState` を使用するリンクコンポーネント。

### `location`
`{ path, query, hash }` を含むリアクティブな `VAtom`。どこからでも `get(location)` できます。

### `navigate(to: string)`
指定したパスへプログラム的に遷移します。
