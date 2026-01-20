# Vitrio

**超軽量リアクティブUIフレームワーク** - Jotaiのシンプルさ × React風TSX

[![npm version](https://badge.fury.io/js/@potetotown%2Fvitrio.svg)](https://www.npmjs.com/package/@potetotown/vitrio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | 日本語

## 🚀 パフォーマンス

**VitrioはSolid.jsより3-4倍高速：**

| 指標             | Vitrio     | SolidJS | React   |
| ---------------- | ---------- | ------- | ------- |
| バンドルサイズ   | **11.9KB** | 13.0KB  | 144.1KB |
| 100クリック (ms) | **2.85**   | 13.76   | 12.83   |
| リスト更新 (ms)  | **4.15**   | 12.04   | 9.95    |

> 📊 詳細は [results.md](./results.md) を参照

## 特徴

- 🎯 **ミニマルAPI** - `v()`, `derive()`, `get()`, `set()` だけ
- ⚡ **リアクティブ** - 自動依存追跡で細粒度更新
- 🏎️ **Solid方式DOM** - 一度作成、バインディングのみ更新（VDOMなし）
- 🎨 **React風TSX** - おなじみのJSXで自然に書ける
- 📦 **軽量** - 約12KB (minified)
- 🧹 **自動クリーンアップ** - ノード削除時にバインディングも破棄
- 🔧 **Bun対応** - モダンなツールチェーン

## インストール

```bash
bun add @potetotown/vitrio
# または
npm install @potetotown/vitrio
```

## クイックスタート

```tsx
import { v, derive, get, set, render } from "@potetotown/vitrio";

// 1. リアクティブな状態を作成
const count = v(0);
const doubled = derive((get) => get(count) * 2);

// 2. React風コンポーネントを書く
function Counter() {
  return (
    <div>
      <button onClick={() => set(count, (c) => c - 1)}>-</button>
      <span>{() => get(count)}</span>
      <span style="color: gray">(×2 = {() => get(doubled)})</span>
      <button onClick={() => set(count, (c) => c + 1)}>+</button>
    </div>
  );
}

// 3. レンダリング
render(<Counter />, document.getElementById("app"));
```

## コア概念

### `v()` でAtom作成

リアクティブな値を作成：

```tsx
const name = v("太郎");
const age = v(25);
const user = v({ id: 1, role: "admin" });
```

### `derive()` で派生状態

自動更新される計算値：

```tsx
const count = v(10);
const doubled = derive((get) => get(count) * 2); // 20
const message = derive((get) => `カウント: ${get(count)}`);
```

### 読み書き

```tsx
// 読み取り
const currentCount = get(count);

// 書き込み
set(count, 5); // 直接値
set(count, (c) => c + 1); // 更新関数
```

### リアクティブテキスト

JSXで関数を使うと自動更新：

```tsx
<span>{() => get(count)}</span> // countが変わると自動再描画
```

### リアクティブ属性

属性も関数で動的に変更可能：

```tsx
<div class={() => get(isActive) ? 'active' : ''}>...</div>
<input disabled={() => get(isLoading)} />
<div style={() => ({ color: get(themeColor) })}>...</div>
```

## API一覧

| API                   | 説明                     |
| --------------------- | ------------------------ |
| `v(初期値)`           | リアクティブなAtomを作成 |
| `derive(fn)`          | 派生値を作成             |
| `get(atom)`           | 現在値を読み取り         |
| `set(atom, 値)`       | 値を更新                 |
| `subscribe(atom, fn)` | 変更を監視               |
| `use(atom)`           | Hook: `[値, セッター]`   |
| `render(jsx, 要素)`   | DOMにマウント            |

## 制御フロー

```tsx
import { Show, For } from '@potetotown/vitrio'

// 条件付きレンダリング
<Show when={isLoggedIn}>
  <Dashboard />
</Show>

// リスト（keyed diff対応）
<For each={items} key={(item) => item.id}>
  {(item) => <li>{item.name}</li>}
</For>
```

## ドキュメント

- [はじめに](./docs/getting-started.md)
- [コアAPI](./docs/api.md)
- [JSX・コンポーネント](./docs/jsx.md)
- [制御フロー](./docs/control-flow.md)
- [ベンチマーク](./docs/benchmarks.md)

## 開発・ベンチマーク

```bash
# 依存関係インストール
bun install

# デモ実行
bun run dev

# ビルド
bun run build

# ベンチマーク実行（Bun推奨）
bun benchmarks/run.ts

# ベンチマーク実行（Node.js版）
node benchmarks/run-node.mjs
```

## 比較

| 機能                 | Vitrio | React | Solid | Jotai |
| -------------------- | ------ | ----- | ----- | ----- |
| バンドルサイズ       | ~12KB  | ~40KB | ~13KB | ~3KB  |
| 仮想DOMなし          | ✅     | ❌    | ✅    | -     |
| 細粒度更新           | ✅     | ❌    | ✅    | ✅    |
| TSX対応              | ✅     | ✅    | ✅    | ✅    |
| インタラクション速度 | 🥇     | 🥉    | 🥈    | -     |

## ライセンス

MIT © 2026
