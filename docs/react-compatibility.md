# Reactとの互換性ガイド

## Migration Path: React からの移行ガイド

### ✅ すぐに使える機能（互換性高い）

**基本的なJSX構文**
```tsx
// React
<div className="container" onClick={handleClick}>
  {count}
</div>

// Vitrio（ほぼ同じ！）
<div class="container" onClick={handleClick}>
  {() => get(count)}
</div>
```

**リスト描画**
```tsx
// React
{items.map(item => <Item key={item.id} {...item} />)}

// Vitrio
<For each={items} key={item => item.id}>
  {item => <Item {...item} />}
</For>
```

**条件分岐**
```tsx
// React
{isVisible && <Modal />}

// Vitrio
<Show when={isVisible}>
  <Modal />
</Show>
```

### ⚠️ 注意が必要な違い

**1. 状態管理の思想が違う**
- React: コンポーネント内で `useState` を使う
- Vitrio: **グローバルなAtom** を作る（Jotaiスタイル）

```tsx
// React（コンポーネントごとに状態を持つ）
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Vitrio（Atomは外で定義）
const count = v(0);
function Counter() {
  return <button onClick={() => set(count, c => c + 1)}>{() => get(count)}</button>;
}
```

**2. リアクティブ式は関数で包む必要がある**
```tsx
// ❌ これは動かない（初回描画のみ）
<span>{get(count)}</span>

// ✅ 関数にすると追跡される
<span>{() => get(count)}</span>
```

**3. `useEffect` の代わりに `createEffect`**
```tsx
// React
useEffect(() => {
  console.log('count changed:', count);
}, [count]);

// Vitrio
createEffect(() => {
  console.log('count changed:', get(count));
});
```

### 🔧 段階的移行の実装例

**戦略: Reactアプリの一部にVitrioを埋め込む**

```tsx
// main.tsx (React側)
import { createRoot } from 'react-dom/client';
import { VitrioIsland } from './VitrioIsland';

function App() {
  return (
    <div>
      <h1>My React App</h1>
      {/* ここだけVitrio */}
      <VitrioIsland />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
```

```tsx
// VitrioIsland.tsx
import { useEffect, useRef } from 'react';
import { render, v, get, set } from '@potetotown/vitrio';

const count = v(0);

function VitrioCounter() {
  return (
    <div>
      <button onClick={() => set(count, c => c - 1)}>-</button>
      <span>{() => get(count)}</span>
      <button onClick={() => set(count, c => c + 1)}>+</button>
    </div>
  );
}

export function VitrioIsland() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      render(<VitrioCounter />, containerRef.current);
    }
  }, []);

  return <div ref={containerRef} />;
}
```

このパターンで、**「速度が必要な部分だけVitrioに置き換える」** ことができるのだ！
