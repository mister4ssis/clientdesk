CREATE TABLE IF NOT EXISTS customer_audit_log (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    operation TEXT NOT NULL
        CHECK (
            operation IN (
                'CREATED',
                'UPDATED',
                'ACTIVATED',
                'DEACTIVATED',
                'REMOTE_CREATED',
                'REMOTE_UPDATED',
                'REMOTE_DELETED',
                'CONFLICT_KEEP_LOCAL',
                'CONFLICT_USE_REMOTE'
            )
        ),
    source TEXT NOT NULL
        CHECK (
            source IN (
                'LOCAL_USER',
                'REMOTE_SYNC',
                'CONFLICT_RESOLUTION',
                'SYSTEM'
            )
        ),
    changed_fields TEXT,
    user_id TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    local_version TEXT,
    remote_version INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_audit_customer_id
    ON customer_audit_log(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_audit_created_at
    ON customer_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_audit_operation
    ON customer_audit_log(operation);

CREATE INDEX IF NOT EXISTS idx_customer_audit_source
    ON customer_audit_log(source);

CREATE TABLE IF NOT EXISTS sync_run_log (
    id TEXT PRIMARY KEY,
    reason TEXT NOT NULL
        CHECK (
            reason IN (
                'STARTUP',
                'PERIODIC',
                'MANUAL',
                'LOCAL_CHANGE',
                'REALTIME_EVENT',
                'RECONNECT'
            )
        ),
    status TEXT NOT NULL
        CHECK (
            status IN (
                'RUNNING',
                'SUCCESS',
                'PARTIAL_SUCCESS',
                'FAILED',
                'CANCELLED'
            )
        ),
    push_processed_count INTEGER NOT NULL DEFAULT 0,
    pull_processed_count INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,
    error_code TEXT,
    user_id TEXT NOT NULL,
    installation_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_run_log_started_at
    ON sync_run_log(started_at);

CREATE INDEX IF NOT EXISTS idx_sync_run_log_status
    ON sync_run_log(status);

CREATE INDEX IF NOT EXISTS idx_sync_run_log_reason
    ON sync_run_log(reason);
