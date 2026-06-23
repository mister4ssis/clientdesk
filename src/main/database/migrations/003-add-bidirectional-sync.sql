ALTER TABLE customers RENAME TO customers_legacy;

CREATE TABLE customers (
    id TEXT PRIMARY KEY,

    person_type TEXT NOT NULL
        CHECK (person_type IN ('FISICA', 'JURIDICA')),

    legal_name TEXT NOT NULL,
    trade_name TEXT,
    representative TEXT,

    tax_id TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    birth_date TEXT,

    postal_code TEXT,
    street TEXT,
    address_number TEXT,
    address_complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,

    notes TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    sync_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (sync_status IN ('PENDING', 'SYNCED', 'ERROR', 'CONFLICT')),

    last_synced_at TEXT,
    sync_error_code TEXT,

    remote_version INTEGER,
    remote_updated_at TEXT,
    deleted_at TEXT,

    sync_conflict INTEGER NOT NULL DEFAULT 0
        CHECK (sync_conflict IN (0, 1))
);

INSERT INTO customers (
    id,
    person_type,
    legal_name,
    trade_name,
    representative,
    tax_id,
    email,
    phone,
    birth_date,
    postal_code,
    street,
    address_number,
    address_complement,
    neighborhood,
    city,
    state,
    notes,
    active,
    created_at,
    updated_at,
    sync_status,
    last_synced_at,
    sync_error_code,
    remote_version,
    remote_updated_at,
    deleted_at,
    sync_conflict
)
SELECT
    id,
    person_type,
    legal_name,
    trade_name,
    representative,
    tax_id,
    email,
    phone,
    birth_date,
    postal_code,
    street,
    address_number,
    address_complement,
    neighborhood,
    city,
    state,
    notes,
    active,
    created_at,
    updated_at,
    sync_status,
    last_synced_at,
    sync_error_code,
    NULL,
    NULL,
    NULL,
    0
FROM customers_legacy;

DROP TABLE customers_legacy;

CREATE INDEX IF NOT EXISTS idx_customers_legal_name
    ON customers(legal_name);

CREATE INDEX IF NOT EXISTS idx_customers_trade_name
    ON customers(trade_name);

CREATE INDEX IF NOT EXISTS idx_customers_representative
    ON customers(representative);

CREATE INDEX IF NOT EXISTS idx_customers_email
    ON customers(email);

CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_active
    ON customers(active);

CREATE INDEX IF NOT EXISTS idx_customers_sync_status
    ON customers(sync_status);

CREATE INDEX IF NOT EXISTS idx_customers_remote_version
    ON customers(remote_version);

CREATE INDEX IF NOT EXISTS idx_customers_remote_updated_at
    ON customers(remote_updated_at);

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at
    ON customers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_customers_sync_conflict
    ON customers(sync_conflict);

CREATE TABLE IF NOT EXISTS sync_cursors (
    scope TEXT PRIMARY KEY,
    last_remote_updated_at TEXT,
    last_remote_id TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY,

    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('CUSTOMER')),

    entity_id TEXT NOT NULL,

    local_data TEXT NOT NULL,
    remote_data TEXT NOT NULL,

    local_updated_at TEXT NOT NULL,
    remote_updated_at TEXT NOT NULL,

    remote_version INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'RESOLVED_LOCAL',
                'RESOLVED_REMOTE'
            )
        ),

    created_at TEXT NOT NULL,
    resolved_at TEXT,

    UNIQUE (entity_type, entity_id, status)
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status
    ON sync_conflicts(status);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity
    ON sync_conflicts(entity_type, entity_id);
