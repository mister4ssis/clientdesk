CREATE INDEX IF NOT EXISTS customers_user_id_idx
    ON public.customers(user_id);

DROP INDEX IF EXISTS customers_tax_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_tax_id_unique
    ON public.customers(user_id, tax_id)
    WHERE tax_id IS NOT NULL;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select_own ON public.customers;
DROP POLICY IF EXISTS customers_insert_own ON public.customers;
DROP POLICY IF EXISTS customers_update_own ON public.customers;

CREATE POLICY customers_select_own
    ON public.customers
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY customers_insert_own
    ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY customers_update_own
    ON public.customers
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.customers
        WHERE user_id IS NULL
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'public.customers contains rows without user_id. Run supabase/manual/assign-existing-customers-owner.sql before enforcing NOT NULL.';
    END IF;

    ALTER TABLE public.customers
        ALTER COLUMN user_id SET NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) TO authenticated;
