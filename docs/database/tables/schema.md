# テーブル定義

対象DBMSは MySQL 8.0 です。実行用DDLは [V001__initial_schema.sql](../../../db/migrations/V001__initial_schema.sql) にあります。

## cards

カードそのものを表す中心テーブルです。カード番号はこのテーブルで一意に管理します。

| カラム | 型 | NULL | 説明 |
|---|---|---:|---|
| id | BIGINT UNSIGNED | 不可 | 主キー |
| card_number | VARCHAR(64) | 不可 | カード番号。例: `BP03-109` |
| name | VARCHAR(255) | 不可 | カード名 |
| class_id | BIGINT UNSIGNED | 不可 | クラスへの外部キー |
| rarity_id | BIGINT UNSIGNED | 不可 | レアリティへの外部キー |
| title_id | BIGINT UNSIGNED | 可 | コラボタイトルへの外部キー。非コラボはNULL |
| cost | SMALLINT UNSIGNED | 可 | コスト |
| power | SMALLINT UNSIGNED | 可 | 攻撃力。持たないカードはNULL |
| defense | SMALLINT UNSIGNED | 可 | 体力。持たないカードはNULL |
| ability_text | TEXT | 可 | 能力・ルールテキスト |
| flavor_text | TEXT | 可 | フレーバーテキスト |
| illustrator_name | VARCHAR(255) | 可 | イラストレーター名 |
| image_url | VARCHAR(2048) | 可 | カード画像のURL |

## 分類マスタ

| テーブル | 主なカラム | 内容 |
|---|---|---|
| card_classes | id, code, name | ニュートラル、エルフなど |
| card_kinds | id, code, name | フォロワー、スペルなどのカード種類 |
| rarities | id, code, name, sort_order | LG、GR、プレミアムなど |
| titles | id, name | コラボタイトル |
| types | id, name | 天使、堕天使など、分解した単位のタイプ |
| keyword_abilities | id, name | 守護、疾走、ファンファーレなど |

## products

収録商品を管理します。

| カラム | 型 | NULL | 説明 |
|---|---|---:|---|
| id | BIGINT UNSIGNED | 不可 | 主キー |
| code | VARCHAR(64) | 不可 | 商品コード。例: `BP03` |
| name | VARCHAR(255) | 不可 | 商品名 |
| product_type | VARCHAR(32) | 不可 | パック、デッキ、PR、その他 |
| release_date | DATE | 可 | 発売日 |

## 中間テーブル

| テーブル | 主キー | 関係 |
|---|---|---|
| card_card_kinds | card_id, card_kind_id | カードと複数カード種類の対応 |
| card_products | card_id, product_id | カードと収録商品の対応 |
| card_types | card_id, type_id | カードと複数タイプの対応 |
| card_keyword_abilities | card_id, keyword_ability_id | カードと複数キーワード能力の対応 |

たとえば「ライルの人形」は、`card_card_kinds` にフォロワーとトークンの2行、`card_types` に人形と学院の2行を持ちます。
