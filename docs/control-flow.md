# Control Flow

条件分岐とリストレンダリング。

## Show - 条件付きレンダリング

```tsx
import { Show } from 'vitrio'

const isLoggedIn = v(false)

function App() {
  return (
    <Show when={() => get(isLoggedIn)} fallback={<LoginButton />}>
      <Dashboard />
    </Show>
  )
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `when` | `boolean \| () => boolean` | 表示条件 |
| `children` | `VNode` | 条件がtrueの時に表示 |
| `fallback` | `VNode` | 条件がfalseの時に表示（オプション） |

---

## For - リストレンダリング

```tsx
import { For } from 'vitrio'

const items = v(['Apple', 'Banana', 'Cherry'])

function FruitList() {
  return (
    <ul>
      <For each={() => get(items)}>
        {(item, index) => <li>{item}</li>}
      </For>
    </ul>
  )
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `each` | `T[] \| () => T[]` | 配列データ |
| `children` | `(item: T, index: number) => VNode` | 各要素のレンダー関数 |

---

## Switch/Match - パターンマッチング

```tsx
import { Switch, Match } from 'vitrio'

const status = v('loading')

function StatusView() {
  return (
    <Switch fallback={<p>Unknown status</p>}>
      <Match when={() => get(status) === 'loading'}>
        <Spinner />
      </Match>
      <Match when={() => get(status) === 'error'}>
        <ErrorMessage />
      </Match>
      <Match when={() => get(status) === 'success'}>
        <SuccessView />
      </Match>
    </Switch>
  )
}
```

---

## 手動での条件分岐

シンプルなケースではJSX内で直接条件分岐もできます：

```tsx
function App() {
  return (
    <div>
      {() => get(isLoggedIn) ? <Dashboard /> : <Login />}
    </div>
  )
}
```

---

## 手動でのリスト

```tsx
function TodoList() {
  return (
    <ul ref={(el) => {
      const update = () => {
        el.innerHTML = ''
        get(todos).forEach((todo, i) => {
          el.appendChild(
            <li>
              {todo}
              <button onClick={() => removeTodo(i)}>×</button>
            </li>
          )
        })
      }
      subscribe(todos, update)
      update()
    }}></ul>
  )
}
```
