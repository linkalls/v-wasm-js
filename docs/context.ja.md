# Context

Vitrioは、プロップスのバケツリレーなしでコンポーネントツリーを通してデータを渡すための Context API を提供します。

## 使い方

Vitrioの遅延コンポーネント評価のおかげで、Reactのように自然にコンテキストを使用できます。

```tsx
import { createContext, useContext } from '@potetotown/vitrio';

// 1. Contextの作成
const ThemeContext = createContext("light");

// 2. Providerの使用
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <ThemedButton />
    </ThemeContext.Provider>
  );
}

// 3. Contextの利用
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button class={theme}>I am {theme}</button>;
}
```

## API

### `createContext<T>(defaultValue: T)`

デフォルト値を持つコンテキストオブジェクトを作成します。

- **戻り値:** `{ Provider, id, defaultValue }`

### `useContext<T>(context: Context<T>)`

コンテキストの現在の値を読み取ります。`Provider` 内で実行されるコンポーネントまたはフック内で呼び出す必要があります。

### `<Provider value={T}>`

子要素に値を提供します。

- **Props:**
  - `value`: 提供する値。
  - `children`: VNode または Component。
