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
import { CustomerSyncService } from './modules/sync/customer-sync.service';
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
    syncOutboxRepository.bootstrapPendingCustomers();

    const customerRepository = new CustomerRepository(currentDatabase, {
      syncOutboxRepository
    });
    const syncStatusService = new SyncStatusService(syncConfig.enabled, syncOutboxRepository);
    const connectivityService = new SupabaseConnectivityService(syncConfig, supabaseClient);
    const customerSyncService = new CustomerSyncService(
      currentDatabase,
      customerRepository,
      syncOutboxRepository,
      supabaseClient
    );
    const backgroundSyncService = new BackgroundSyncService(
      syncConfig,
      connectivityService,
      syncOutboxRepository,
      customerSyncService,
      syncStatusService
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
      syncService: backgroundSyncService
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
