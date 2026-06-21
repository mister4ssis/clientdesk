CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,

    person_type TEXT NOT NULL
        CHECK (person_type IN ('FISICA', 'JURIDICA')),

    legal_name TEXT NOT NULL,
    trade_name TEXT,

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
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_legal_name
    ON customers(legal_name);

CREATE INDEX IF NOT EXISTS idx_customers_trade_name
    ON customers(trade_name);

CREATE INDEX IF NOT EXISTS idx_customers_email
    ON customers(email);

CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_active
    ON customers(active);
