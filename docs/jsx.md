# JSX & Components

VitrioでのJSXとコンポーネントの書き方。

## 基本構文

VitrioはReact風のJSXをサポートしています。

```tsx
function Greeting() {
  return <h1>Hello, World!</h1>
}
```

## Props

```tsx
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>
}

// 使用
<Button label="Click me" onClick={() => console.log('clicked')} />
```

## イベントハンドラ

`onClick`, `onInput`, `onChange` などをサポート：

```tsx
<button onClick={() => doSomething()}>Click</button>
<input onInput={(e) => set(text, e.target.value)} />
```

## スタイル

文字列または オブジェクト：

```tsx
// 文字列
<div style="color: red; font-size: 16px;">Text</div>

// オブジェクト
<div style={{ color: 'red', fontSize: '16px' }}>Text</div>
```

## クラス

`class` または `className`：

```tsx
<div class="card">Content</div>
<div className="card">Content</div>
```

## Ref

要素への直接アクセス：

```tsx
<input ref={(el) => {
  el.focus()
  el.value = 'initial'
}} />
```

## リアクティブテキスト

関数を使うと自動更新：

```tsx
const count = v(0)

// ❌ 静的（更新されない）
<span>{get(count)}</span>

// ✅ リアクティブ（自動更新）
<span>{() => get(count)}</span>
```

## コンポーネントパターン

### シンプルなコンポーネント

```tsx
function Card({ title, children }) {
  return (
    <div class="card">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
```

### 状態を持つコンポーネント

```tsx
// グローバル状態
const count = v(0)

function Counter() {
  return (
    <div>
      <span>{() => get(count)}</span>
      <button onClick={() => set(count, c => c + 1)}>+</button>
    </div>
  )
}
```

### Refを使った手動更新

```tsx
function TodoList() {
  return (
    <ul ref={(el) => {
      const update = () => {
        el.innerHTML = ''
        get(todos).forEach(todo => {
          el.appendChild(<li>{todo}</li>)
        })
      }
      subscribe(todos, update)
      update()
    }}></ul>
  )
}
```

## Fragment

```tsx
import { Fragment } from 'vitrio'

function List() {
  return (
    <>
      <Item />
      <Item />
    </>
  )
}
```
