import { app, BrowserWindow } from 'electron';
import { closeDatabase, getCurrentUserId, openDatabaseForUser } from './database/database';
import type { DatabaseConnection } from './database/database';
import { getUserDatabasePath } from './database/database-path';
import { runMigrations } from './database/migration-runner';
import { ApplicationError } from './errors/application-error';
import { ErrorCode } from './errors/error-codes';
import { createClientDeskSupabaseClient } from './integrations/supabase/supabase-client';
import { loadSupabaseSyncConfig } from './integrations/supabase/supabase-config';
import { SupabaseConnectivityService } from './integrations/supabase/supabase-connectivity.service';
import { registerIpcHandlers } from './ipc/register-ipc-handlers';
import { AuthService } from './modules/auth/auth.service';
import { LocalAuthProfileRepository } from './modules/auth/local-auth-profile.repository';
import { SecureSessionStorage } from './modules/auth/secure-session-storage';
import { BackupService } from './modules/backup/backup.service';
import { CustomerRepository } from './modules/customers/customer.repository';
import { CustomerService } from './modules/customers/customer.service';
import { BackgroundSyncService } from './modules/sync/background-sync.service';
import { CustomerConflictService } from './modules/sync/customer-conflict.service';
import { CustomerPullService } from './modules/sync/customer-pull.service';
import { CustomerSyncService } from './modules/sync/customer-sync.service';
import { RealtimeChannelManager } from './modules/sync/realtime/realtime-channel-manager';
import { RealtimeSyncTriggerService } from './modules/sync/realtime/realtime-sync-trigger.service';
import { SyncConflictRepository } from './modules/sync/sync-conflict.repository';
import { SyncCursorRepository } from './modules/sync/sync-cursor.repository';
import { SyncOutboxRepository } from './modules/sync/sync-outbox.repository';
import { SyncScheduler } from './modules/sync/sync-scheduler';
import { SyncStatusService } from './modules/sync/sync-status.service';
import { createMainWindow } from './windows/main-window';
import type { AuthUser } from '@shared/auth/auth.types';
import type { CustomerListResultDto } from '@shared/customers/customer.dto';
import type { SyncStatus } from '@shared/sync/sync.types';

let syncScheduler: SyncScheduler | null = null;
let authService: AuthService | null = null;
let realtimeChannelManager: RealtimeChannelManager | null = null;
let realtimeSyncTriggerService: RealtimeSyncTriggerService | null = null;
let currentRealtimeAccessToken: string | null = null;

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const syncConfig = loadSupabaseSyncConfig();
  const sessionStorage = new SecureSessionStorage({
    userDataPath: app.getPath('userData')
  });
  const profileStorage = new SecureSessionStorage({
    userDataPath: app.getPath('userData'),
    fileName: 'profile.enc'
  });
  const localProfileRepository = new LocalAuthProfileRepository(profileStorage);
  const supabaseClient = createClientDeskSupabaseClient(syncConfig, sessionStorage);

  authService = new AuthService({
    supabaseClient,
    sessionStorage,
    localProfileRepository,
    onAuthenticated: (user, mode) => {
      registerUserServices(user, mode);
    },
    onSignedOut: () => {
      closeUserSession();
    },
    onSessionTokenChanged: (accessToken) => {
      currentRealtimeAccessToken = accessToken;
      void realtimeChannelManager?.updateAuth(accessToken);
    }
  });

  registerLockedServices();
  await authService.initialize();

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  function registerUserServices(user: AuthUser, mode: 'online' | 'offline'): void {
    syncScheduler?.stop();
    const database = openDatabaseForUser(user.id, app.getPath('userData'));
    runMigrations(database);
    writeLocalDatabaseMetadata(database, user);
    registerServices(database, user, mode === 'online');
  }

  function closeUserSession(): void {
    realtimeSyncTriggerService?.stop();
    realtimeSyncTriggerService = null;
    void realtimeChannelManager?.shutdown();
    realtimeChannelManager = null;
    syncScheduler?.stop();
    syncScheduler = null;
    closeDatabase();
    registerLockedServices();
  }

  function registerServices(
    currentDatabase: DatabaseConnection,
    user: AuthUser,
    startScheduler: boolean
  ): void {
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
      customerPullService,
      {
        canSynchronize: () => {
          const authState = authService?.getState();

          return (
            authState?.status === 'AUTHENTICATED' &&
            authState.user?.id === user.id &&
            getCurrentUserId() === user.id
          );
        }
      }
    );
    realtimeSyncTriggerService?.stop();
    realtimeSyncTriggerService = new RealtimeSyncTriggerService({
      debounceMs: syncConfig.realtimePullDebounceMs,
      requestSync: {
        requestSync: (options) => backgroundSyncService.requestSync(options)
      },
      syncStatusService
    });
    void realtimeChannelManager?.shutdown();
    realtimeChannelManager = new RealtimeChannelManager(supabaseClient, {
      enabled: syncConfig.enabled && syncConfig.realtimeEnabled && startScheduler,
      reconnectMaxSeconds: syncConfig.realtimeReconnectMaxSeconds,
      syncStatusService,
      onDatabaseChange: (payload) => {
        realtimeSyncTriggerService?.handleDatabaseChange(payload);
      }
    });
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
    const backupService = new BackupService({
      getUserDataPath: () => app.getPath('userData'),
      getCurrentDatabasePath: () => getUserDatabasePath(user.id, app.getPath('userData')),
      getCurrentOwnerUserId: () => user.id,
      openCurrentDatabase: () => openDatabaseForUser(user.id, app.getPath('userData')),
      onDatabaseRestored: (restoredDatabase) => {
        syncScheduler?.stop();
        registerServices(restoredDatabase, user, startScheduler);
      }
    });

    registerIpcHandlers({
      authService: authService ?? undefined,
      customerService,
      backupService,
      syncService: backgroundSyncService,
      customerConflictService
    });

    if (startScheduler) {
      syncScheduler.start();
      if (syncConfig.enabled && syncConfig.realtimeEnabled) {
        realtimeSyncTriggerService.start();
        void realtimeChannelManager.start(user.id, currentRealtimeAccessToken);
      }
    } else {
      syncStatusService.setRealtimeStatus(syncConfig.realtimeEnabled ? 'OFFLINE' : 'DISABLED');
    }
  }

  function registerLockedServices(): void {
    registerIpcHandlers({
      authService: authService ?? undefined,
      customerService: createLockedCustomerService(),
      backupService: createLockedBackupService(),
      syncService: createLockedSyncService(),
      customerConflictService: createLockedCustomerConflictService()
    });
  }
}

app.on('before-quit', () => {
  realtimeSyncTriggerService?.stop();
  void realtimeChannelManager?.shutdown();
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

function createLockedCustomerService() {
  return {
    create: () => {
      throwNotAuthenticated();
    },
    list: (): CustomerListResultDto => {
      throwNotAuthenticated();
    },
    getById: () => {
      throwNotAuthenticated();
    },
    update: () => {
      throwNotAuthenticated();
    },
    setActive: () => {
      throwNotAuthenticated();
    }
  };
}

function createLockedBackupService() {
  return {
    createBackup: async () => {
      throwNotAuthenticated();
    },
    restoreBackup: async () => {
      throwNotAuthenticated();
    },
    validateBackup: async () => {
      throwNotAuthenticated();
    }
  };
}

function createLockedSyncService() {
  return {
    getStatus: (): SyncStatus => ({
      enabled: false,
      pullEnabled: false,
      connectivity: 'DISABLED',
      running: false,
      direction: 'IDLE',
      pendingCount: 0,
      conflictCount: 0,
      realtimeStatus: 'DISABLED',
      lastStartedAt: null,
      lastCompletedAt: null,
      lastPushAt: null,
      lastPullAt: null,
      lastRealtimeEventAt: null,
      lastRealtimeConnectedAt: null,
      lastSuccessfulAt: null,
      lastErrorCode: ErrorCode.AuthNotAuthenticated
    }),
    runNow: async () => ({
      started: false,
      status: createLockedSyncService().getStatus()
    })
  };
}

function createLockedCustomerConflictService() {
  return {
    listConflicts: () => {
      throwNotAuthenticated();
    },
    getConflict: () => {
      throwNotAuthenticated();
    },
    resolveKeepLocal: async () => {
      throwNotAuthenticated();
    },
    resolveUseRemote: () => {
      throwNotAuthenticated();
    }
  };
}

function throwNotAuthenticated(): never {
  throw new ApplicationError(ErrorCode.AuthNotAuthenticated, 'Usuário não autenticado.');
}

function writeLocalDatabaseMetadata(database: DatabaseConnection, user: AuthUser): void {
  const now = new Date().toISOString();
  const statement = database.prepare(
    `
      INSERT INTO app_metadata (key, value)
      VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
    `
  );

  statement.run({ key: 'owner_user_id', value: user.id });
  statement.run({ key: 'owner_email', value: user.email ?? '' });
  statement.run({ key: 'app_version', value: app.getVersion() });
  statement.run({ key: 'metadata_updated_at', value: now });
}
