# 測定・プロファイリング手順

## ベンチ再計測
1. 依存が無い状態なのでそのまま実行可能: `node benchmarks/run-node.mjs`
2. `results.md` が自動更新される。更新後は `git add results.md` → `git commit` を忘れずに。

## 追加のプロファイル
- **Chromium Performance**: ベンチ実行後に開いたブラウザで `F12` → Performance タブ → 録画してロード/リスト操作を1回走らせる。WASM初期化やリスト差分のフレームを確認。
- **CPU/メモリ**: 同じタブでメモリスナップショットを取得し、`<For>` の再利用でリークがないかを見る。
- **WASMロード計測**: `initWasm({ onPerf })` のフックに `console.log` を噛ませ、`fetch/compile/setup` の各フェーズ時間を記録。プリコンパイルモジュールを渡す場合は `module` オプションも併用。

## クリンアップ
- プロファイル用に入れた `console.log` 等はコミット前に除去。
- ベンチ差分のみのコミットを作成し、不要なら revert で戻す。
