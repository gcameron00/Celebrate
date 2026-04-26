-- Celebrate: initial schema

CREATE TABLE celebrations (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  view_id          TEXT     NOT NULL UNIQUE,
  edit_token_hash  TEXT     NOT NULL,
  occasion         TEXT     NOT NULL,
  components       TEXT     NOT NULL DEFAULT '{}',  -- JSON blob
  created_at       TEXT     NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT     NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_celebrations_view_id       ON celebrations (view_id);
CREATE INDEX idx_celebrations_edit_token    ON celebrations (edit_token_hash);
