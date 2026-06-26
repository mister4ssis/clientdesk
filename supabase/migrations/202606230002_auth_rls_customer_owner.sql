ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS customers_user_id_idx
    ON public.customers(user_id);

DROP INDEX IF EXISTS customers_tax_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_tax_id_unique
    ON public.customers(user_id, tax_id)
    WHERE tax_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.customers
        WHERE user_id IS NULL
        LIMIT 1
    ) THEN
        RAISE NOTICE 'public.customers still contains rows without user_id. Run supabase/manual/assign-existing-customers-owner.sql before enforcing NOT NULL.';
    ELSE
        ALTER TABLE public.customers
            ALTER COLUMN user_id SET NOT NULL;
    END IF;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.sync_upsert_customer(
    customer_data JSONB,
    expected_version BIGINT
)
RETURNS TABLE (
    result TEXT,
    remote_version BIGINT,
    remote_updated_at TIMESTAMPTZ,
    remote_customer JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    current_customer public.customers%ROWTYPE;
    saved_customer public.customers%ROWTYPE;
    customer_id UUID;
BEGIN
    IF (select auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    customer_id := (customer_data->>'id')::UUID;

    SELECT *
    INTO current_customer
    FROM public.customers
    WHERE id = customer_id
      AND user_id = (select auth.uid())
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.customers (
            id,
            user_id,
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
            deleted_at
        )
        VALUES (
            customer_id,
            (select auth.uid()),
            customer_data->>'person_type',
            customer_data->>'legal_name',
            customer_data->>'trade_name',
            customer_data->>'representative',
            customer_data->>'tax_id',
            customer_data->>'email',
            customer_data->>'phone',
            NULLIF(customer_data->>'birth_date', '')::DATE,
            customer_data->>'postal_code',
            customer_data->>'street',
            customer_data->>'address_number',
            customer_data->>'address_complement',
            customer_data->>'neighborhood',
            customer_data->>'city',
            customer_data->>'state',
            customer_data->>'notes',
            COALESCE((customer_data->>'active')::BOOLEAN, TRUE),
            COALESCE((customer_data->>'created_at')::TIMESTAMPTZ, now()),
            now(),
            NULLIF(customer_data->>'deleted_at', '')::TIMESTAMPTZ
        )
        RETURNING *
        INTO saved_customer;

        RETURN QUERY SELECT
            'UPSERTED'::TEXT,
            saved_customer.version,
            saved_customer.updated_at,
            to_jsonb(saved_customer);
        RETURN;
    END IF;

    IF expected_version IS NULL OR current_customer.version <> expected_version THEN
        RETURN QUERY SELECT
            'CONFLICT'::TEXT,
            current_customer.version,
            current_customer.updated_at,
            to_jsonb(current_customer);
        RETURN;
    END IF;

    UPDATE public.customers
    SET
        person_type = customer_data->>'person_type',
        legal_name = customer_data->>'legal_name',
        trade_name = customer_data->>'trade_name',
        representative = customer_data->>'representative',
        tax_id = customer_data->>'tax_id',
        email = customer_data->>'email',
        phone = customer_data->>'phone',
        birth_date = NULLIF(customer_data->>'birth_date', '')::DATE,
        postal_code = customer_data->>'postal_code',
        street = customer_data->>'street',
        address_number = customer_data->>'address_number',
        address_complement = customer_data->>'address_complement',
        neighborhood = customer_data->>'neighborhood',
        city = customer_data->>'city',
        state = customer_data->>'state',
        notes = customer_data->>'notes',
        active = COALESCE((customer_data->>'active')::BOOLEAN, TRUE),
        deleted_at = NULLIF(customer_data->>'deleted_at', '')::TIMESTAMPTZ
    WHERE id = customer_id
      AND user_id = (select auth.uid())
    RETURNING *
    INTO saved_customer;

    RETURN QUERY SELECT
        'UPSERTED'::TEXT,
        saved_customer.version,
        saved_customer.updated_at,
        to_jsonb(saved_customer);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) TO authenticated;
