
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
