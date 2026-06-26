WITH required_columns(column_name, data_type, is_nullable) AS (
    VALUES
        ('id', 'uuid', 'NO'),
        ('user_id', 'uuid', 'NO'),
        ('person_type', 'text', 'NO'),
        ('legal_name', 'text', 'NO'),
        ('trade_name', 'text', 'YES'),
        ('representative', 'text', 'YES'),
        ('tax_id', 'text', 'YES'),
        ('email', 'text', 'YES'),
        ('phone', 'text', 'YES'),
        ('birth_date', 'date', 'YES'),
        ('postal_code', 'text', 'YES'),
        ('street', 'text', 'YES'),
        ('address_number', 'text', 'YES'),
        ('address_complement', 'text', 'YES'),
        ('neighborhood', 'text', 'YES'),
        ('city', 'text', 'YES'),
        ('state', 'text', 'YES'),
        ('notes', 'text', 'YES'),
        ('active', 'boolean', 'NO'),
        ('version', 'bigint', 'NO'),
        ('deleted_at', 'timestamp with time zone', 'YES'),
        ('created_at', 'timestamp with time zone', 'NO'),
        ('updated_at', 'timestamp with time zone', 'NO')
),
column_status AS (
    SELECT
        required_columns.column_name,
        columns.column_name IS NOT NULL
            AND columns.data_type = required_columns.data_type
            AND columns.is_nullable = required_columns.is_nullable AS passed
    FROM required_columns
    LEFT JOIN information_schema.columns columns
        ON columns.table_schema = 'public'
       AND columns.table_name = 'customers'
       AND columns.column_name = required_columns.column_name
),
required_indexes(index_name) AS (
    VALUES
        ('customers_user_id_idx'),
        ('customers_user_tax_id_unique'),
        ('idx_remote_customers_legal_name'),
        ('idx_remote_customers_representative'),
        ('idx_remote_customers_user_updated'),
        ('idx_remote_customers_deleted_at')
),
index_status AS (
    SELECT
        required_indexes.index_name,
        indexes.indexname IS NOT NULL AS passed
    FROM required_indexes
    LEFT JOIN pg_indexes indexes
        ON indexes.schemaname = 'public'
       AND indexes.tablename = 'customers'
       AND indexes.indexname = required_indexes.index_name
),
required_policies(policy_name, command_name) AS (
    VALUES
        ('customers_select_own', 'SELECT'),
        ('customers_insert_own', 'INSERT'),
        ('customers_update_own', 'UPDATE')
),
policy_status AS (
    SELECT
        required_policies.policy_name,
        policies.policyname IS NOT NULL
            AND policies.roles = ARRAY['authenticated']::name[] AS passed
    FROM required_policies
    LEFT JOIN pg_policies policies
        ON policies.schemaname = 'public'
       AND policies.tablename = 'customers'
       AND policies.policyname = required_policies.policy_name
       AND policies.cmd = required_policies.command_name
)
SELECT
    'table_public_customers_exists' AS check_name,
    to_regclass('public.customers') IS NOT NULL AS passed
UNION ALL
SELECT
    'constraint_primary_key_id',
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_info
        WHERE constraint_info.conrelid = 'public.customers'::regclass
          AND constraint_info.contype = 'p'
    )
UNION ALL
SELECT
    'constraint_user_id_references_auth_users',
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_info
        JOIN pg_class referenced_table
            ON referenced_table.oid = constraint_info.confrelid
        JOIN pg_namespace referenced_schema
            ON referenced_schema.oid = referenced_table.relnamespace
        JOIN unnest(constraint_info.conkey) AS constrained_columns(attnum)
            ON TRUE
        JOIN pg_attribute constrained_attribute
            ON constrained_attribute.attrelid = constraint_info.conrelid
           AND constrained_attribute.attnum = constrained_columns.attnum
        WHERE constraint_info.conrelid = 'public.customers'::regclass
          AND constraint_info.contype = 'f'
          AND constrained_attribute.attname = 'user_id'
          AND referenced_schema.nspname = 'auth'
          AND referenced_table.relname = 'users'
    )
UNION ALL
SELECT
    'columns_' || column_name,
    passed
FROM column_status
UNION ALL
SELECT
    'index_' || index_name,
    passed
FROM index_status
UNION ALL
SELECT
    'customers_rls_enabled',
    relrowsecurity
FROM pg_class
WHERE oid = 'public.customers'::regclass
UNION ALL
SELECT
    'no_delete_policy',
    NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customers'
          AND cmd = 'DELETE'
    )
UNION ALL
SELECT
    'no_anon_policy',
    NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'customers'
          AND 'anon' = ANY(roles)
    )
UNION ALL
SELECT
    'no_global_tax_id_unique_index',
    NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'customers'
          AND indexname = 'customers_tax_id_unique'
    )
UNION ALL
SELECT
    'policy_' || policy_name,
    passed
FROM policy_status
UNION ALL
SELECT
    'trigger_trg_customers_sync_metadata',
    EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'public.customers'::regclass
          AND tgname = 'trg_customers_sync_metadata'
          AND NOT tgisinternal
    )
UNION ALL
SELECT
    'function_set_customer_sync_metadata',
    EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_proc.proname = 'set_customer_sync_metadata'
    )
UNION ALL
SELECT
    'rpc_sync_upsert_customer',
    EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_proc.proname = 'sync_upsert_customer'
    )
UNION ALL
SELECT
    'rpc_sync_upsert_customer_security_invoker',
    EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_proc.proname = 'sync_upsert_customer'
          AND pg_proc.prosecdef = FALSE
    )
UNION ALL
SELECT
    'rpc_sync_upsert_customer_search_path_public',
    EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_proc.proname = 'sync_upsert_customer'
          AND pg_proc.proconfig @> ARRAY['search_path=public']
    )
ORDER BY check_name;
