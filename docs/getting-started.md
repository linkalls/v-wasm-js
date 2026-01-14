# Getting Started

Vitrioを使ったリアクティブUIの構築を始めましょう。

## インストール

```bash
bun add @potetotown/vitrio
```

## プロジェクトセットアップ

### 1. tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@potetotown/vitrio",
    "moduleResolution": "bundler"
  }
}
```

### 2. index.html

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Vitrio App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

### 3. main.tsx

```tsx
import { v, derive, get, set, render } from '@potetotown/vitrio'

// 状態定義
const count = v(0)
const doubled = derive(get => get(count) * 2)

// コンポーネント
function App() {
  return (
    <div>
      <h1>Hello Vitrio!</h1>
      <p>Count: {() => get(count)}</p>
      <p>Doubled: {() => get(doubled)}</p>
      <button onClick={() => set(count, c => c + 1)}>
        Increment
      </button>
    </div>
  )
}

// マウント
render(<App />, document.getElementById('app'))
```

## 開発サーバー

```bash
bun --hot main.tsx
```

## 次のステップ

- [Core API](./api.md) - 詳細なAPI解説
- [JSX & Components](./jsx.md) - コンポーネントの書き方
- [Control Flow](./control-flow.md) - 条件分岐とリスト
