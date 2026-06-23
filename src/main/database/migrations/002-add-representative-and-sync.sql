ALTER TABLE customers
    ADD COLUMN representative TEXT;

ALTER TABLE customers
    ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'ERROR'));

ALTER TABLE customers
    ADD COLUMN last_synced_at TEXT;

ALTER TABLE customers
    ADD COLUMN sync_error_code TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_representative
    ON customers(representative);

CREATE INDEX IF NOT EXISTS idx_customers_sync_status
    ON customers(sync_status);

CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,

    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('CUSTOMER')),

    entity_id TEXT NOT NULL,

    operation TEXT NOT NULL
        CHECK (operation IN ('UPSERT')),

    attempts INTEGER NOT NULL DEFAULT 0,

    next_attempt_at TEXT,

    last_error_code TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_next_attempt
    ON sync_outbox(next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
    ON sync_outbox(entity_type, entity_id);
