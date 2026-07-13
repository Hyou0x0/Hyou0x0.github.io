
# ふたりToDo Realtime Database版

1. Firebase ConsoleでRealtime Databaseを作成する。
2. 表示されたURLを `firebase-config.js` の `databaseURL` に貼る。
3. Realtime Databaseのルールへ `database.rules.json` の内容を貼って公開する。
4. Authenticationで匿名ログインを有効にする。
5. このフォルダの中身を `Hyou0x0.github.io` のルートへ置く。

## 更新
```sh
git add .
git commit -m "Rebuild with Realtime Database"
git push
```

## 高速化内容
- 起動直後はlocalStorageキャッシュを表示
- Firebase接続を画面表示の条件にしない
- DOM要素を再利用して差分配置
- SortableJSは一度だけ初期化
- 並び替えは移動した1件のみ書き込み
- 追加・チェック・削除は先に画面へ反映
- Service Workerでアプリ本体をキャッシュ
- 名前は端末側だけに保存


## UI v2 の変更

- 削除ボタンをリストから撤去
- 左スワイプで削除
- 右スワイプで完了／未完了
- フィルターを「すべて・自分・相手・重要」に変更
- 自分／相手は、この端末で選択中の利用者を基準に自動判定


## v3 migration
- Realtime Databaseが空の場合、旧Firestoreのtodosを初回だけ自動移行
- 旧localStorageキャッシュキーも読み込み
- オフライン表示状態のバグを修正


## 復元ボタン
右上の ↻ を押すと、旧Firestoreの todos を強制再検索します。復元失敗時は画面にFirebaseエラーコードを表示します。


## v5
- Firestore復元処理に10秒タイムアウトを追加
- 復元ボタンの無限回転を防止
- 認証待ちも8秒でエラー表示


## v6
- 復元ボタンの回転アニメーションを廃止
- 復元処理を独立watchdogで12秒後に必ず停止
- index.html / app.js / styles.css / firebase-config.jsをService Workerでネットワーク優先に変更


## v7
Firestore SDKを使わずREST APIで旧todosを直接取得。authorName→author、priority→important、Timestamp→ミリ秒へ変換。


## UI v8 の変更

- 並び替えハンドルをチェックボックスの隣から右端へ移動
- ハンドルのタッチ領域を50〜54pxへ拡大
- ハンドルと重要ボタンの境界線を追加
- チェックボックスのタッチ位置と並び替え操作を分離


## UI v9 の変更

- 旧Firestoreデータの復元・移行機能を完全に削除
- 右上の復元ボタン（↻）を削除
- Realtime Databaseだけを使用する通常運用版へ整理


## UI v11（ホーム画面アプリ同期・検証版）

- v10で失敗していたCSS / JS / manifestのバージョン付与を修正
- `caches` 未定義時にJavaScriptが停止する問題を修正
- Firebase接続より前にキャッシュ削除処理を実行しない構造へ変更
- 不要な `goOffline()` / `goOnline()` 強制切り替えを廃止
- 匿名認証、接続状態、タスク取得の各失敗を画面へ表示
- 12秒間データ応答がない場合も状態を表示
- Service Workerは安全に登録解除し、Realtime Databaseを常に正とする


## UI v12（共有同期・端末データ救出版）

- 「同期済み」を接続状態だけでなく共有タスク件数つきで表示
- Safari側のlocalStorageにだけ残ったタスクを、共有Realtime Databaseが空のとき一度だけ救出
- 初回の空スナップショットで端末キャッシュを消さない
- 新規追加はFirebaseへの保存完了後に「保存済み」と表示
- 保存失敗時はエラーコードを画面へ表示し、入力文字を復元
- 旧Firestore復元機能は含まない


## UI v13

- Realtime Database URLを実在するDBへ修正
- 修正前: `https://todo-f9789-80f29-default-rtdb.firebaseio.com/`
- 修正後: `https://todo-f9789-default-rtdb.firebaseio.com/`
- Safariとホーム画面アプリが同じ共有DBを参照するよう修正
