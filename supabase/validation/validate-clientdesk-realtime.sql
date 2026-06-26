SELECT
    proname AS function_name,
    prosecdef AS security_definer,
    proconfig AS function_config
FROM pg_proc
WHERE proname = 'broadcast_customer_changes'
  AND pronamespace = 'public'::regnamespace;

SELECT
    tgname AS trigger_name,
    tgenabled AS trigger_enabled
FROM pg_trigger
WHERE tgrelid = 'public.customers'::regclass
  AND tgname = 'trg_customers_realtime_broadcast'
  AND NOT tgisinternal;

SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'realtime'
  AND tablename = 'messages'
  AND policyname = 'clientdesk_customer_realtime_own_topic';

SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'realtime'
  AND c.relname = 'messages';
