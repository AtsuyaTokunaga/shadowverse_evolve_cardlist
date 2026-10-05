-- Shadowverse EVOLVE card list initial schema
-- MySQL 8.0+

CREATE TABLE card_classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_card_classes_code (code),
  UNIQUE KEY uq_card_classes_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_kinds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_card_kinds_code (code),
  UNIQUE KEY uq_card_kinds_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE rarities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rarities_code (code),
  UNIQUE KEY uq_rarities_name (name),
  UNIQUE KEY uq_rarities_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE titles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_titles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  product_type VARCHAR(32) NOT NULL,
  release_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE keyword_abilities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_keyword_abilities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  card_number VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  rarity_id BIGINT UNSIGNED NOT NULL,
  title_id BIGINT UNSIGNED NULL,
  cost SMALLINT UNSIGNED NULL,
  power SMALLINT UNSIGNED NULL,
  defense SMALLINT UNSIGNED NULL,
  ability_text TEXT NULL,
  flavor_text TEXT NULL,
  illustrator_name VARCHAR(255) NULL,
  image_url VARCHAR(2048) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cards_card_number (card_number),
  KEY idx_cards_name (name),
  KEY idx_cards_class_id (class_id),
  KEY idx_cards_rarity_id (rarity_id),
  KEY idx_cards_title_id (title_id),
  KEY idx_cards_cost (cost),
  KEY idx_cards_power (power),
  KEY idx_cards_defense (defense),
  CONSTRAINT fk_cards_class_id
    FOREIGN KEY (class_id) REFERENCES card_classes (id),
  CONSTRAINT fk_cards_rarity_id
    FOREIGN KEY (rarity_id) REFERENCES rarities (id),
  CONSTRAINT fk_cards_title_id
    FOREIGN KEY (title_id) REFERENCES titles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_card_kinds (
  card_id BIGINT UNSIGNED NOT NULL,
  card_kind_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, card_kind_id),
  KEY idx_card_card_kinds_card_kind_id (card_kind_id),
  CONSTRAINT fk_card_card_kinds_card_id
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  CONSTRAINT fk_card_card_kinds_card_kind_id
    FOREIGN KEY (card_kind_id) REFERENCES card_kinds (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_products (
  card_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, product_id),
  KEY idx_card_products_product_id (product_id),
  CONSTRAINT fk_card_products_card_id
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  CONSTRAINT fk_card_products_product_id
    FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_types (
  card_id BIGINT UNSIGNED NOT NULL,
  type_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, type_id),
  KEY idx_card_types_type_id (type_id),
  CONSTRAINT fk_card_types_card_id
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  CONSTRAINT fk_card_types_type_id
    FOREIGN KEY (type_id) REFERENCES types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE card_keyword_abilities (
  card_id BIGINT UNSIGNED NOT NULL,
  keyword_ability_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, keyword_ability_id),
  KEY idx_card_keyword_abilities_keyword_ability_id (keyword_ability_id),
  CONSTRAINT fk_card_keyword_abilities_card_id
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  CONSTRAINT fk_card_keyword_abilities_keyword_ability_id
    FOREIGN KEY (keyword_ability_id) REFERENCES keyword_abilities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
