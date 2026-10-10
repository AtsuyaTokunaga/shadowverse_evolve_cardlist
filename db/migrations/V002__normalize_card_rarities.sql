-- Allow a card to have multiple rarities, for example GR and Premium.
-- Apply after V001__initial_schema.sql.

CREATE TABLE card_rarities (
  card_id BIGINT UNSIGNED NOT NULL,
  rarity_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id, rarity_id),
  KEY idx_card_rarities_rarity_id (rarity_id),
  CONSTRAINT fk_card_rarities_card_id
    FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  CONSTRAINT fk_card_rarities_rarity_id
    FOREIGN KEY (rarity_id) REFERENCES rarities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Preserve the single rarity stored by V001 before removing that column.
INSERT IGNORE INTO card_rarities (card_id, rarity_id)
SELECT id, rarity_id
FROM cards
WHERE rarity_id IS NOT NULL;

ALTER TABLE cards
  DROP FOREIGN KEY fk_cards_rarity_id,
  DROP INDEX idx_cards_rarity_id,
  DROP COLUMN rarity_id;
