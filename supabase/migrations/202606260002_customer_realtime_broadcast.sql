CREATE OR REPLACE FUNCTION public.broadcast_customer_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
DECLARE
    owner_user_id UUID;
    customer_topic TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        owner_user_id := OLD.user_id;
    ELSE
        owner_user_id := NEW.user_id;
    END IF;

    IF owner_user_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;

        RETURN NEW;
    END IF;

    customer_topic := 'user:' || owner_user_id::TEXT || ':customers';

    PERFORM realtime.broadcast_changes(
        customer_topic,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW END,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_realtime_broadcast ON public.customers;

CREATE TRIGGER trg_customers_realtime_broadcast
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_customer_changes();

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientdesk_customer_realtime_own_topic ON realtime.messages;

CREATE POLICY clientdesk_customer_realtime_own_topic
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
        realtime.topic() = 'user:' || (select auth.uid())::TEXT || ':customers'
    );

REVOKE ALL ON FUNCTION public.broadcast_customer_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.broadcast_customer_changes() FROM anon;
