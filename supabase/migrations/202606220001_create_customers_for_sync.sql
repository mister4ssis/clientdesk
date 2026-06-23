CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY,
    person_type TEXT NOT NULL
        CHECK (person_type IN ('FISICA', 'JURIDICA')),
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    representative TEXT,
    tax_id TEXT,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    postal_code TEXT,
    street TEXT,
    address_number TEXT,
    address_complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT
        CHECK (state IS NULL OR char_length(state) = 2),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS representative TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS customers_tax_id_unique
    ON public.customers(tax_id)
    WHERE tax_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remote_customers_legal_name
    ON public.customers(legal_name);

CREATE INDEX IF NOT EXISTS idx_remote_customers_representative
    ON public.customers(representative);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
