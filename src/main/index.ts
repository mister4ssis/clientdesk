import { app, BrowserWindow } from 'electron';
import { openDatabase, closeDatabase } from './database/database';
import { runMigrations } from './database/migration-runner';
import { registerIpcHandlers } from './ipc/register-ipc-handlers';
import { CustomerRepository } from './modules/customers/customer.repository';
import { CustomerService } from './modules/customers/customer.service';
import { createMainWindow } from './windows/main-window';

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const database = openDatabase();
  runMigrations(database);

  const customerRepository = new CustomerRepository(database);
  const customerService = new CustomerService(customerRepository);

  registerIpcHandlers({
    customerService
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

app.on('before-quit', () => {
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
