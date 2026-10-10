# カードDOM取得スクリプト

公式サイトの検索結果からカード詳細ページを見つけ、ブラウザでレンダリング後のDOMを保存します。

## 初回セットアップ

```powershell
npm install
npm run install:browser
```

## 実行例

```powershell
npm run fetch:card-dom -- --expansion SD02
```

検索URLの `expansion_name` だけを `SD02` に変更し、それ以外はカードリストの既定条件を使用します。

検索結果が複数ページに分かれる場合も、追加読み込み用の検索ページを順に取得して全件を対象にします。途中で終了しても、同じコマンドを再実行すれば保存済みHTMLをスキップして未取得分だけを続行します。

デフォルトでは、以下を保存します。

```text
data/raw/SD02/
  SD02-001.html
  SD02-002.html
  ...
  manifest.json
```

同じカード番号のHTMLがある場合は取得をスキップします。再取得する場合は `--overwrite` を指定します。

```powershell
npm run fetch:card-dom -- --expansion SD02 --overwrite --delay-ms 1500
```

`manifest.json` には、検索URL、公式サイト上の件数、保存済み件数、各ファイルの取得元URL、取得失敗を記録します。取得したHTMLはデータ抽出用の中間成果物であり、次の工程でJSONやシードSQLへ変換します。

## シードSQLの生成

保存したHTMLから、カード・マスター・中間テーブルのデータを含むMySQL用SQLを生成できます。

```powershell
npm run generate:seed -- --expansion SD02 --output db/seeds/002__sd02_cards.sql
npm run generate:seed -- --expansion SD03 --output db/seeds/003__sd03_cards.sql
```

カード番号、名称、クラス、カード種類、タイプ、レアリティ、ステータス、能力文、フレーバーテキスト、イラストレーター、画像URL、収録商品を抽出します。能力文内のアイコンは `【ファンファーレ】` の形式に変換し、キーワード能力はこの表記から正規化して登録します。ステータス・クラス・コストの表記はキーワード能力として登録しません。
