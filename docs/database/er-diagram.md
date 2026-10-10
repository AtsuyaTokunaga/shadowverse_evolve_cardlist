# ER 図

```mermaid
erDiagram
    CARD_CLASSES ||--o{ CARDS : classifies
    CARDS ||--o{ CARD_RARITIES : has
    RARITIES ||--o{ CARD_RARITIES : classifies
    TITLES o|--o{ CARDS : labels
    CARDS ||--o{ CARD_CARD_KINDS : has
    CARD_KINDS ||--o{ CARD_CARD_KINDS : classifies
    CARDS ||--o{ CARD_PRODUCTS : is_in
    PRODUCTS ||--o{ CARD_PRODUCTS : contains
    CARDS ||--o{ CARD_TYPES : has
    TYPES ||--o{ CARD_TYPES : classifies
    CARDS ||--o{ CARD_KEYWORD_ABILITIES : has
    KEYWORD_ABILITIES ||--o{ CARD_KEYWORD_ABILITIES : classifies

    CARDS {
        bigint id PK
        varchar card_number UK
        varchar name
        bigint class_id FK "nullable"
        bigint title_id FK "nullable"
        smallint cost "nullable"
        smallint power "nullable"
        smallint defense "nullable"
        text ability_text
        text flavor_text
    }
    CARD_KINDS {
        bigint id PK
        varchar code UK
        varchar name UK
    }
    CARD_CARD_KINDS {
        bigint card_id PK, FK
        bigint card_kind_id PK, FK
    }
    CARD_RARITIES {
        bigint card_id PK, FK
        bigint rarity_id PK, FK
    }
    PRODUCTS {
        bigint id PK
        varchar code UK
        varchar name
        varchar product_type
        date release_date
    }
    CARD_PRODUCTS {
        bigint card_id PK, FK
        bigint product_id PK, FK
    }
    TYPES {
        bigint id PK
        varchar name UK
    }
    CARD_TYPES {
        bigint card_id PK, FK
        bigint type_id PK, FK
    }
    KEYWORD_ABILITIES {
        bigint id PK
        varchar name UK
    }
    CARD_KEYWORD_ABILITIES {
        bigint card_id PK, FK
        bigint keyword_ability_id PK, FK
    }
```

`cards` が中心テーブルです。カード番号はこのテーブルの一意なカラムであり、別テーブルには分けません。

カード種類、レアリティ、収録商品、タイプ、キーワード能力は、カードと多対多の関係です。そのため、それぞれ `card_card_kinds`、`card_rarities`、`card_products`、`card_types`、`card_keyword_abilities` を中間テーブルとして使用します。タイトルはコラボカードのみ設定するため、`cards.title_id` をNULL許容にしています。
