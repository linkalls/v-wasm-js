# updateDerived キュー走査の変更

- `updateDerived` は `shift()` の代わりにインデックス (`i`) を使用してキューを反復処理するようになりました。
- 依存関係は引き続き `queue.push` でエンキューされ、既存の `visited` セットによって再訪問が防止されます。
