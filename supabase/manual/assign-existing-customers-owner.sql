-- Manual backfill for existing ClientDesk customers.
--
-- 1. Replace the placeholder with the authenticated owner UUID.
-- 2. Run this only in a controlled Supabase environment.
-- 3. Validate the remaining NULL count before enforcing NOT NULL.
-- 4. Do not use service_role in the desktop app. This script is for database maintenance only.

BEGIN;

-- Replace this value manually.
-- Example: '00000000-0000-4000-8000-000000000000'
WITH owner AS (
    SELECT '<OWNER_USER_ID_UUID>'::UUID AS user_id
)
UPDATE public.customers
SET user_id = owner.user_id
FROM owner
WHERE public.customers.user_id IS NULL;

SELECT count(*) AS customers_without_owner
FROM public.customers
WHERE user_id IS NULL;

-- Commit only after validating the count above is expected.
-- COMMIT;
ROLLBACK;
