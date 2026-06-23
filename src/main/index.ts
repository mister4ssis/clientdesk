import { app, BrowserWindow } from 'electron';
import { openDatabase, closeDatabase } from './database/database';
import type { DatabaseConnection } from './database/database';
import { runMigrations } from './database/migration-runner';
import { createClientDeskSupabaseClient } from './integrations/supabase/supabase-client';
import { loadSupabaseSyncConfig } from './integrations/supabase/supabase-config';
import { SupabaseConnectivityService } from './integrations/supabase/supabase-connectivity.service';
import { registerIpcHandlers } from './ipc/register-ipc-handlers';
import { BackupService } from './modules/backup/backup.service';
import { CustomerRepository } from './modules/customers/customer.repository';
import { CustomerService } from './modules/customers/customer.service';
import { BackgroundSyncService } from './modules/sync/background-sync.service';
import { CustomerConflictService } from './modules/sync/customer-conflict.service';
import { CustomerPullService } from './modules/sync/customer-pull.service';
import { CustomerSyncService } from './modules/sync/customer-sync.service';
import { SyncConflictRepository } from './modules/sync/sync-conflict.repository';
import { SyncCursorRepository } from './modules/sync/sync-cursor.repository';
import { SyncOutboxRepository } from './modules/sync/sync-outbox.repository';
import { SyncScheduler } from './modules/sync/sync-scheduler';
import { SyncStatusService } from './modules/sync/sync-status.service';
import { createMainWindow } from './windows/main-window';

let syncScheduler: SyncScheduler | null = null;

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const database = openDatabase();
  runMigrations(database);
  const syncConfig = loadSupabaseSyncConfig();
  const supabaseClient = createClientDeskSupabaseClient(syncConfig);
  const backupService = new BackupService({
    getUserDataPath: () => app.getPath('userData'),
    onDatabaseRestored: (restoredDatabase) => {
      syncScheduler?.stop();
      registerServices(restoredDatabase, true);
    }
  });

  function registerServices(currentDatabase: DatabaseConnection, startScheduler: boolean): void {
    const syncOutboxRepository = new SyncOutboxRepository(currentDatabase);
    const syncCursorRepository = new SyncCursorRepository(currentDatabase);
    const syncConflictRepository = new SyncConflictRepository(currentDatabase);
    syncOutboxRepository.bootstrapPendingCustomers();

    const customerRepository = new CustomerRepository(currentDatabase, {
      syncOutboxRepository
    });
    const syncStatusService = new SyncStatusService(syncConfig.enabled, syncOutboxRepository, {
      pullEnabled: syncConfig.pullEnabled,
      syncConflictRepository
    });
    const connectivityService = new SupabaseConnectivityService(syncConfig, supabaseClient);
    const customerSyncService = new CustomerSyncService(
      currentDatabase,
      customerRepository,
      syncOutboxRepository,
      supabaseClient,
      syncConflictRepository
    );
    const customerPullService = new CustomerPullService(
      syncConfig,
      supabaseClient,
      customerRepository,
      syncOutboxRepository,
      syncCursorRepository,
      syncConflictRepository
    );
    const backgroundSyncService = new BackgroundSyncService(
      syncConfig,
      connectivityService,
      syncOutboxRepository,
      customerSyncService,
      syncStatusService,
      customerPullService
    );
    const customerConflictService = new CustomerConflictService(
      currentDatabase,
      customerRepository,
      syncOutboxRepository,
      syncConflictRepository,
      customerSyncService
    );
    syncScheduler = new SyncScheduler(
      backgroundSyncService,
      syncConfig.intervalMinutes,
      syncConfig.enabled
    );
    const customerService = new CustomerService(customerRepository, {
      onCustomerChanged: () => syncScheduler?.requestRun()
    });

    registerIpcHandlers({
      customerService,
      backupService,
      syncService: backgroundSyncService,
      customerConflictService
    });

    if (startScheduler) {
      syncScheduler.start();
    }
  }

  registerServices(database, false);

  createMainWindow();
  syncScheduler?.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

app.on('before-quit', () => {
  syncScheduler?.stop();
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch((error: unknown) => {
  console.error('Failed to start ClientDesk.', error);
  closeDatabase();
  app.quit();
});
