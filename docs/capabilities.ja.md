# 機能範囲と制限事項

## Vitrio v0.0.2 - 機能マトリクス

本ドキュメントは、Vitrioで現在「利用可能」「実験的」「未対応」の機能を整理した公式ガイドです。

### ✅ 本番利用可能

| 機能 | 状態 | 説明 |
|------|------|------|
| リアクティブ状態管理 | ✅ Ready | `v()` / `derive()` による細粒度リアクティビティ |
| JSXレンダリング | ✅ Ready | React風TSXをサポート |
| 条件分岐 (`Show`) | ✅ Ready | `when` による表示制御 |
| リスト描画 (`For`) | ✅ Ready | キー付き高速更新 |
| ルーティング | ✅ Ready | History APIベース |
| Store | ✅ Ready | Proxyベースのネスト状態 |
| Resource | ✅ Ready | `createResource` で非同期状態管理 |
| ErrorBoundary | ✅ Ready | 例外時フォールバック描画 |
| Suspense | ✅ Ready | 非同期境界とフォールバック |
| SSR文字列描画 | ✅ Ready | `@potetotown/vitrio/server` の `renderToString` |

### ⚠️ 実験的

| 機能 | 状態 | 注意点 |
|------|------|--------|
| WASM最適化 | ⚠️ Experimental | 高速だがデバッグ難易度は高め |
| Context API | ⚠️ Experimental | 基本用途は安定、複雑DIは検証継続 |
| Hydration | ⚠️ Experimental | SSR連携の運用は発展途上 |

### ❌ 未対応 / 非搭載

1. **Streaming SSR**（`renderToString` は対応済み、ストリーミングは未実装）
2. **専用DevTools**（React DevTools相当なし）
3. **公式テストユーティリティパッケージ**

### 商用利用の目安

**向いているケース**
- 高速なSPA
- 軽量バンドル重視のプロダクト
- 内部ダッシュボード/管理画面

**慎重に評価すべきケース**
- 直近でStreaming SSRが必須
- 充実した公式エコシステム（DevTools/Testing）を前提とする組織
