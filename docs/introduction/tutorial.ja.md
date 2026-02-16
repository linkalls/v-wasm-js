# Introduction / チュートリアル

Vitrioは **性能最優先のReact代替**（細粒度リアクティブ）なん。
このチュートリアルでは、いちばんシンプルな「アプリっぽい構成」を最短で作る。

- SPAルーティング
- route `loader`（データ取得）
- route `action`（更新）
- `<Suspense>`（非同期UI）
- `<Form>`（actionを雑に書ける）

> サーバ機能は今はスコープ外（意図的に入れてない）。

---

## 1) インストール

```bash
bun add @potetotown/vitrio
```

---

## 2) アプリをrenderする

```tsx
import { render } from "@potetotown/vitrio";
import { App } from "./app";

render(<App />, document.getElementById("app"));
```

---

## 3) ルーティング + loader/action の最小アプリ

```tsx
import {
  Router,
  Route,
  A,
  Suspense,
  Form,
  v,
  get,
  set,
} from "@potetotown/vitrio";

const apiCount = v(0);

export function App() {
  return (
    <Router>
      <Suspense fallback={<div>loading...</div>}>
        <Route path="/">
          {() => (
            <div>
              <h1>Home</h1>
              <A href="/users/42">go</A>
            </div>
          )}
        </Route>

        <Route
          id="user"
          path="/users/:id"
          loader={({ params }) => {
            // ダミーの非同期
            return Promise.resolve({ id: params.id, count: get(apiCount) });
          }}
          action={(_, input: { inc: number }) => {
            set(apiCount, (c) => c + input.inc);
            return { ok: true as const };
          }}
        >
          {(data, ctx) => (
            <div>
              <h1>User {data.id}</h1>
              <div>count: {data.count}</div>

              <Form action={ctx.action}>
                <input type="hidden" name="inc" value="1" />
                <button type="submit">inc</button>
              </Form>

              <A href="/">back</A>
            </div>
          )}
        </Route>
      </Suspense>
    </Router>
  );
}
```

---

## 4) キャッシュとinvalidate

Routeのloader結果はキャッシュされる。
消したいときは以下を使う：

- `invalidateRoute("user")`: route id/prefix に一致するキャッシュを全部消す
- `invalidateCurrent()`: **今マッチしてるrouteインスタンス（params + search込み）だけ**消す

actionは、loaderがある場合デフォで「今のrouteインスタンス」をinvalidateする。
