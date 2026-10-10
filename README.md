# Shadowverse Evolve Cardlist

シャドウバースエボルヴのカード情報を管理するデータベースと API を開発するプロジェクトです。

## ディレクトリ構成

- `docs/database/`: ER 図、テーブル定義書、命名規則などの DB 設計資料
- `db/migrations/`: テーブル作成・変更のための DDL
- `db/seeds/`: 初期データおよびマスターデータの投入用 SQL
- `docs/api/`: API 仕様書
- `backend/`: API の実装
- `infra/`: DB やローカル開発環境の構成ファイル

具体的な DB 製品と API の技術スタックは、採用時にこの README と各ディレクトリの README を更新します。

## カード詳細DOMの取得

公式カードリストの検索結果から各カード詳細ページを開き、ブラウザでレンダリング後のDOMを保存できます。

初回だけ、Node.jsの依存関係と取得用ブラウザをセットアップします。

```powershell
npm install
npm run install:browser
```

カードセットを指定して実行します。たとえばスターターデッキ第2弾を取得する場合は次のとおりです。

```powershell
npm run fetch:card-dom -- --expansion SD02
```

`SD02` を `SD03` や `BP01` などの収録商品コードに差し替えると、対象のカードセットを取得できます。検索時には、公式カードリストの `expansion_name` 以外の条件をすべて指定なしとして使用します。

取得したHTMLと取得情報は、以下のように保存されます。`data/raw/` はGit管理の対象外です。

```text
data/raw/SD02/
  SD02-001.html
  SD02-002.html
  ...
  manifest.json
```

保存済みのHTMLを再取得する場合は `--overwrite` を、カード間の待機時間をミリ秒単位で変更する場合は `--delay-ms` を指定します。

```powershell
npm run fetch:card-dom -- --expansion SD02 --overwrite
npm run fetch:card-dom -- --expansion SD02 --delay-ms 1500
```

詳しいオプションは [scripts/README.md](scripts/README.md) を参照してください。

## シードSQLの生成

保存済みDOMからMySQL用のシードSQLを生成します。

```powershell
npm run generate:seed -- --expansion SD02 --output db/seeds/002__sd02_cards.sql
npm run generate:seed -- --expansion SD03 --output db/seeds/003__sd03_cards.sql
```

生成SQLはカード本体に加え、クラス・カード種類・レアリティ・収録商品・タイプ・キーワード能力と、その関連データを投入します。
