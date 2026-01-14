# Core API

Vitrioのコア関数リファレンス。

## `v(initial)`

リアクティブなatom（状態）を作成します。

```tsx
const count = v(0)
const name = v('John')
const user = v({ id: 1, name: 'Alice' })
const items = v<string[]>([])
```

### 型

```tsx
function v<T>(initial: T): VAtom<T>
```

---

## `derive(fn)`

他のatomから派生する計算値を作成します。依存しているatomが変更されると自動的に再計算されます。

```tsx
const count = v(10)
const doubled = derive(get => get(count) * 2)       // 20
const isEven = derive(get => get(count) % 2 === 0)  // true
```

複数のatomに依存できます：

```tsx
const firstName = v('John')
const lastName = v('Doe')
const fullName = derive(get => `${get(firstName)} ${get(lastName)}`)
```

### 型

```tsx
function derive<T>(read: (get: Getter) => T): VAtom<T>
```

---

## `get(atom)`

atomの現在の値を取得します。

```tsx
const count = v(5)
console.log(get(count))  // 5
```

**レンダリングコンテキスト内**で呼ばれた場合、自動的に変更を購読します：

```tsx
<span>{() => get(count)}</span>  // countが変わると自動更新
```

---

## `set(atom, value)`

atomの値を更新します。

```tsx
const count = v(0)

// 直接値を設定
set(count, 5)

// 前の値を使って更新
set(count, prev => prev + 1)
```

---

## `subscribe(atom, callback)`

atomの変更を購読します。購読解除関数を返します。

```tsx
const count = v(0)

const unsubscribe = subscribe(count, () => {
  console.log('Count changed:', get(count))
})

set(count, 1)  // "Count changed: 1"

unsubscribe()  // 購読解除
```

---

## `use(atom)`

Reactのフックのように `[value, setter]` のタプルを返します。

```tsx
function Counter() {
  const [count, setCount] = use(countAtom)
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

---

## `render(component, container)`

コンポーネントをDOMにマウントします。

```tsx
render(<App />, document.getElementById('app'))
```

関数コンポーネントも渡せます：

```tsx
render(() => <App />, document.getElementById('app'))
```
