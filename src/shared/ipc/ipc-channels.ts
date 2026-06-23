export const IPC_CHANNELS = {
  app: {
    getVersion: 'app:get-version'
  },
  customers: {
    create: 'customers:create',
    list: 'customers:list',
    getById: 'customers:get-by-id',
    update: 'customers:update',
    setActive: 'customers:set-active'
  },
  backup: {
    create: 'backup:create',
    restore: 'backup:restore',
    validate: 'backup:validate'
  },
  sync: {
    getStatus: 'sync:get-status',
    runNow: 'sync:run-now',
    listConflicts: 'sync:list-conflicts',
    getConflict: 'sync:get-conflict',
    resolveKeepLocal: 'sync:resolve-keep-local',
    resolveUseRemote: 'sync:resolve-use-remote'
  }
} as const;
