-- EP and similar cards can have no class on the official card list.
-- Apply after V002__normalize_card_rarities.sql.

ALTER TABLE cards
  DROP FOREIGN KEY fk_cards_class_id;

ALTER TABLE cards
  MODIFY class_id BIGINT UNSIGNED NULL;

ALTER TABLE cards
  ADD CONSTRAINT fk_cards_class_id
    FOREIGN KEY (class_id) REFERENCES card_classes (id);
