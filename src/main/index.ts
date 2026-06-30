import { app, BrowserWindow } from 'electron';
import { closeDatabase, getCurrentUserId, openDatabaseForUser } from './database/database';
import type { DatabaseConnection } from './database/database';
import { getUserDatabasePath } from './database/database-path';
import { runMigrations } from './database/migration-runner';
import { ApplicationError } from './errors/application-error';
import { ErrorCode } from './errors/error-codes';
import { createClientDeskSupabaseClient } from './integrations/supabase/supabase-client';
import {
  getSupabaseConfigDiagnostic,
  loadSupabaseSyncConfig
} from './integrations/supabase/supabase-config';
import { SupabaseConnectivityService } from './integrations/supabase/supabase-connectivity.service';
import { registerIpcHandlers } from './ipc/register-ipc-handlers';
import { AuthEventLogger } from './logging/auth-event-logger';
import { AuthService } from './modules/auth/auth.service';
import { LocalAuthProfileRepository } from './modules/auth/local-auth-profile.repository';
import { SecureSessionStorage } from './modules/auth/secure-session-storage';
import { CustomerAuditRepository } from './modules/audit/customer-audit.repository';
import { CustomerAuditService } from './modules/audit/customer-audit.service';
import { BackupService } from './modules/backup/backup.service';
import { CustomerRepository } from './modules/customers/customer.repository';
import { CustomerService } from './modules/customers/customer.service';
import { DiagnosticsExportService } from './modules/diagnostics/diagnostics-export.service';
import { DiagnosticsService } from './modules/diagnostics/diagnostics.service';
import { RetentionService } from './modules/diagnostics/retention.service';
import { SyncRunLogRepository } from './modules/diagnostics/sync-run-log.repository';
import { InstallationService } from './modules/installation/installation.service';
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
import { loadUpdateConfig } from './modules/update/update-config';
import { UpdateLifecycleService } from './modules/update/update-lifecycle.service';
import { UpdateService } from './modules/update/update.service';
import { createMainWindow } from './windows/main-window';
import type { AuthUser } from '@shared/auth/auth.types';
import type { CustomerListResultDto } from '@shared/customers/customer.dto';
import type { SyncStatus } from '@shared/sync/sync.types';
import {
  CURRENT_LOCAL_SCHEMA_VERSION,
  MINIMUM_SUPPORTED_APP_VERSION,
  MINIMUM_SUPPORTED_SCHEMA_VERSION
} from '@shared/version/schema-compatibility';

let syncScheduler: SyncScheduler | null = null;
let authService: AuthService | null = null;
let realtimeChannelManager: RealtimeChannelManager | null = null;
let realtimeSyncTriggerService: RealtimeSyncTriggerService | null = null;
let currentRealtimeAccessToken: string | null = null;
let updateService: UpdateService | null = null;
let currentBackupService: BackupService | null = null;
let currentBackgroundSyncService: BackgroundSyncService | null = null;
let currentCustomerConflictService: CustomerConflictService | null = null;
let migrationInProgress = false;

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const supabaseConfigDiagnostic = getSupabaseConfigDiagnostic();
  const syncConfig = loadSupabaseSyncConfig();
  const updateConfig = loadUpdateConfig();
  const authEventLogger = new AuthEventLogger(app.getPath('logs'), () => ({
    hasSupabaseUrl: supabaseConfigDiagnostic.hasSupabaseUrl,
    hasPublishableKey: supabaseConfigDiagnostic.hasPublishableKey,
    platform: process.platform,
    packaged: app.isPackaged
  }));
  const sessionStorage = new SecureSessionStorage({
    userDataPath: app.getPath('userData')
  });
  const profileStorage = new SecureSessionStorage({
    userDataPath: app.getPath('userData'),
    fileName: 'profile.enc'
  });
  const localProfileRepository = new LocalAuthProfileRepository(profileStorage);
  const installationService = new InstallationService(app.getPath('userData'));
  const supabaseClient = createClientDeskSupabaseClient(syncConfig, sessionStorage);
  const updateLifecycleService = new UpdateLifecycleService({
    isBackupInProgress: () => currentBackupService?.isOperationInProgress() ?? false,
    isSyncRunning: () => currentBackgroundSyncService?.isRunning() ?? false,
    isConflictResolutionInProgress: () =>
      currentCustomerConflictService?.isOperationInProgress() ?? false,
    isMigrationInProgress: () => migrationInProgress,
    stopBackgroundWork: () => {
      realtimeSyncTriggerService?.stop();
      void realtimeChannelManager?.shutdown();
      syncScheduler?.stop();
    },
    closeDatabase: () => closeDatabase()
  });
  updateService = new UpdateService(updateConfig, updateLifecycleService);
  updateService.initialize();

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
    },
    authLogger: authEventLogger
  });

  registerLockedServices();
  await authService.initialize();

  createMainWindow();
  scheduleInitialUpdateCheck(updateConfig.checkDelaySeconds);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  function registerUserServices(user: AuthUser, mode: 'online' | 'offline'): void {
    syncScheduler?.stop();
    const database = openDatabaseForUser(user.id, app.getPath('userData'));
    migrationInProgress = true;
    try {
      runMigrations(database);
    } finally {
      migrationInProgress = false;
    }
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
    currentBackupService = null;
    currentBackgroundSyncService = null;
    currentCustomerConflictService = null;
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
    const customerAuditRepository = new CustomerAuditRepository(currentDatabase);
    const syncRunLogRepository = new SyncRunLogRepository(currentDatabase);
    syncOutboxRepository.bootstrapPendingCustomers();
    new RetentionService(customerAuditRepository, syncRunLogRepository, {
      auditRetentionDays: syncConfig.auditRetentionDays,
      syncLogRetentionDays: syncConfig.syncLogRetentionDays,
      syncLogMaxRows: syncConfig.syncLogMaxRows
    }).run();

    const auditContext = () => ({
      userId: user.id,
      installationId: installationService.getInstallationId()
    });

    const customerRepository = new CustomerRepository(currentDatabase, {
      syncOutboxRepository,
      customerAuditRepository,
      getAuditContext: auditContext
    });
    const customerAuditService = new CustomerAuditService(customerAuditRepository, () => user.id);
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
            getCurrentUserId() === user.id &&
            isLocalSchemaCompatible(currentDatabase)
          );
        },
        syncRunLogRepository,
        getRunContext: auditContext
      }
    );
    currentBackgroundSyncService = backgroundSyncService;
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
    currentCustomerConflictService = customerConflictService;
    syncScheduler = new SyncScheduler(
      backgroundSyncService,
      syncConfig.intervalMinutes,
      syncConfig.enabled
    );
    const customerService = new CustomerService(customerRepository, {
      onCustomerChanged: () => syncScheduler?.requestRun('LOCAL_CHANGE')
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
    currentBackupService = backupService;
    const diagnosticsService = new DiagnosticsService({
      database: currentDatabase,
      authService: authService as AuthService,
      syncService: backgroundSyncService,
      syncOutboxRepository,
      syncConflictRepository,
      syncCursorRepository,
      syncRunLogRepository,
      installationService,
      getAppVersion: () => app.getVersion()
    });
    const diagnosticsExportService = new DiagnosticsExportService(diagnosticsService);

    registerIpcHandlers({
      authService: authService ?? undefined,
      customerService,
      backupService,
      syncService: backgroundSyncService,
      customerConflictService,
      customerAuditService,
      diagnosticsService,
      diagnosticsExportService,
      updateService: updateService ?? undefined
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
      customerConflictService: createLockedCustomerConflictService(),
      customerAuditService: createLockedCustomerAuditService(),
      diagnosticsService: createLockedDiagnosticsService(),
      diagnosticsExportService: createLockedDiagnosticsExportService(),
      updateService: updateService ?? undefined
    });
  }
}

app.on('before-quit', () => {
  updateService?.stop();
  realtimeSyncTriggerService?.stop();
  void realtimeChannelManager?.shutdown();
  syncScheduler?.stop();
  closeDatabase();
});

function scheduleInitialUpdateCheck(delaySeconds: number): void {
  if (!updateService || updateService.getState().status === 'DISABLED') {
    return;
  }

  const timer = setTimeout(() => {
    void updateService?.check().catch(() => {
      // O estado público já recebe ERROR e o IPC/log sanitiza detalhes quando necessário.
    });
  }, delaySeconds * 1000);

  timer.unref();
}

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

function createLockedCustomerAuditService() {
  return {
    listByCustomer: () => {
      throwNotAuthenticated();
    }
  };
}

function createLockedDiagnosticsService() {
  return {
    getSummary: () => {
      throwNotAuthenticated();
    },
    listSyncRuns: () => {
      throwNotAuthenticated();
    }
  };
}

function createLockedDiagnosticsExportService() {
  return {
    export: async () => {
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
  statement.run({ key: 'local_schema_version', value: String(readLocalSchemaVersion(database)) });
  statement.run({ key: 'minimum_supported_app_version', value: MINIMUM_SUPPORTED_APP_VERSION });
  statement.run({
    key: 'minimum_supported_schema_version',
    value: String(MINIMUM_SUPPORTED_SCHEMA_VERSION)
  });
  statement.run({ key: 'metadata_updated_at', value: now });
}

function isLocalSchemaCompatible(database: DatabaseConnection): boolean {
  const schemaVersion = readLocalSchemaVersion(database);

  return (
    schemaVersion >= MINIMUM_SUPPORTED_SCHEMA_VERSION &&
    schemaVersion <= CURRENT_LOCAL_SCHEMA_VERSION
  );
}

function readLocalSchemaVersion(database: DatabaseConnection): number {
  const row = database
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get() as { version: number | null };

  return row.version ?? 0;
}
