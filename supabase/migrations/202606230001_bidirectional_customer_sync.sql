ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.customers
    ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remote_customers_user_updated
    ON public.customers(user_id, updated_at, id);

CREATE INDEX IF NOT EXISTS idx_remote_customers_deleted_at
    ON public.customers(deleted_at);

CREATE OR REPLACE FUNCTION public.set_customer_sync_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = COALESCE(NEW.created_at, now());
        NEW.updated_at = COALESCE(NEW.updated_at, now());
        NEW.version = COALESCE(NEW.version, 1);
        RETURN NEW;
    END IF;

    NEW.created_at = OLD.created_at;
    NEW.user_id = OLD.user_id;
    NEW.version = OLD.version + 1;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_sync_metadata ON public.customers;

CREATE TRIGGER trg_customers_sync_metadata
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_sync_metadata();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select_own ON public.customers;
DROP POLICY IF EXISTS customers_insert_own ON public.customers;
DROP POLICY IF EXISTS customers_update_own ON public.customers;

CREATE POLICY customers_select_own
    ON public.customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY customers_insert_own
    ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_update_own
    ON public.customers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

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
SET search_path = public
AS $$
DECLARE
    current_customer public.customers%ROWTYPE;
    saved_customer public.customers%ROWTYPE;
    customer_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    customer_id := (customer_data->>'id')::UUID;

    SELECT *
    INTO current_customer
    FROM public.customers
    WHERE id = customer_id
      AND user_id = auth.uid()
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
            auth.uid(),
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
      AND user_id = auth.uid()
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
GRANT EXECUTE ON FUNCTION public.sync_upsert_customer(JSONB, BIGINT) TO authenticated;
