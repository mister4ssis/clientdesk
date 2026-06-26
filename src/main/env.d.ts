/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_SUPABASE_URL?: string;
  readonly MAIN_VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly MAIN_VITE_SYNC_ENABLED?: string;
  readonly MAIN_VITE_SYNC_INTERVAL_MINUTES?: string;
  readonly MAIN_VITE_SYNC_BATCH_SIZE?: string;
  readonly MAIN_VITE_SYNC_REQUEST_TIMEOUT_MS?: string;
  readonly MAIN_VITE_SYNC_PULL_ENABLED?: string;
  readonly MAIN_VITE_SYNC_PULL_BATCH_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
