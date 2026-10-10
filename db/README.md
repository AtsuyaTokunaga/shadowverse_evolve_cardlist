# データベース構築ファイル

## migrations

スキーマを作成・変更する DDL を配置します。ファイル名は実行順が分かる形式にします。

```text
V001__initial_schema.sql
V002__create_cards.sql
```

適用済みのマイグレーションは編集せず、変更用の新しい SQL ファイルを追加します。

複数レアリティとクラス表記がないカードに対応するため、現在はV001からV003まで順に適用します。

```sql
SOURCE C:/Users/a28to/shadowverse_evolve_cardlist/db/migrations/V001__initial_schema.sql;
SOURCE C:/Users/a28to/shadowverse_evolve_cardlist/db/migrations/V002__normalize_card_rarities.sql;
SOURCE C:/Users/a28to/shadowverse_evolve_cardlist/db/migrations/V003__allow_cards_without_class.sql;
```

## seeds

初期データやマスターデータを投入する SQL を配置します。開発環境用のデータと、本番でも必要なマスターデータは区別して管理します。

seed SQL はUTF-8で保存し、先頭で `SET NAMES utf8mb4;` を実行します。Windowsの `mysql` クライアントから `SOURCE` で読み込む場合も、日本語をUTF-8として送信できます。seedは、適用済みのすべてのマイグレーションに対応した形式で生成します。
