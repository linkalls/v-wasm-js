# Roadmap for Vitrio

Vitrioは「超軽量」「高性能（WASM）」「開発者体験（DX）」を主軸に置いたリアクティブUIフレームワークです。
`@potetotown/vitrio` として、以下のロードマップに基づいて開発を進めます。

## 1. Core Philosophy (基本理念)
*   **Minimalism**: 必要最小限のAPIとバンドルサイズ。
*   **Performance**: WASMによる高速な依存関係グラフ計算。
*   **Modern DX**: JSX, TypeScript, Hooks-like API.

## 2. Feature Strategy (機能戦略)

### ✅ Included (実装予定・推奨)
*   **Suspense / Async Rendering**: 非同期データ取得時のUI制御 (`<Suspense>`)。
*   **Error Boundaries**: コンポーネントレベルでのエラー捕捉とフォールバック。
*   **Hydration**: SSRされたHTMLに対するイベントリスナーの接続。
*   **Portals**: モーダルやツールチップのためのDOM階層外レンダリング。
*   **Transitions**: 状態変化時のUIブロックを防ぐ仕組み。

### ❌ Excluded (非推奨・コアに含まない)
*   **Heavy CSS-in-JS**: `styled-components` 等は内蔵せず、ユーザーの選択に委ねる（Tailwind, CSS Modules推奨）。
*   **Complex State Management**: Redux/Recoil等のレイヤーは不要（VitrioのAtomで完結）。
*   **Legacy Browser Support**: IE11等はサポート対象外。Modern Browserのみ。
*   **Class Components**: 関数コンポーネントのみをサポート。

## 3. Server Side Rendering (SSR) Plan

WASMを活用しつつ、段階的に実装します。

*   **Phase 1: String Rendering (`renderToString`)**
    *   Node.js/Bun環境でコンポーネントツリーをHTML文字列として出力。
    *   `renderToString(<App />)` の実装。
*   **Phase 2: Hydration**
    *   クライアント側で既存のDOM構造を再利用し、イベントリスナーのみを接続。
    *   WASMグラフの初期状態（State）の復元（Dehydration/Rehydration）。
*   **Phase 3: Streaming SSR**
    *   `Suspense` と連携し、準備できたコンテンツから順次ブラウザに送信。

## 4. Package Strategy (パッケージ構成)

現在は **Single Package (`@potetotown/vitrio`)** として運用します。
将来的な機能拡張に伴い、以下の方針で管理します。

1.  **Current**: Single Package
    *   全ての機能を1つのパッケージに集約。
    *   `exports` フィールドを活用し、機能ごとのエントリーポイントを提供（例: `import ... from "@potetotown/vitrio/server"`）。
2.  **Future**: Monorepo (必要が生じた場合)
    *   `@vitrio/core`: リアクティビティエンジン（WASM）。
    *   `@vitrio/dom`: ブラウザ向けレンダラー。
    *   `@vitrio/server`: SSR用ユーティリティ。

---
*このロードマップは開発状況に応じて更新されます。*
