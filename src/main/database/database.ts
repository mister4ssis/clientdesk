import Database from 'better-sqlite3';
import { getDatabasePath } from './database-path';

export type DatabaseConnection = Database.Database;

interface OpenDatabaseOptions {
  databasePath?: string;
}

let connection: DatabaseConnection | null = null;

export function openDatabase(options: OpenDatabaseOptions = {}): DatabaseConnection {
  if (connection?.open) {
    return connection;
  }

  const databasePath = options.databasePath ?? getDatabasePath();
  connection = new Database(databasePath);
  configureDatabase(connection);

  return connection;
}

export function getDatabase(): DatabaseConnection {
  if (!connection?.open) {
    throw new Error('Database connection has not been opened.');
  }

  return connection;
}

export function closeDatabase(): void {
  if (connection?.open) {
    connection.close();
  }

  connection = null;
}

export function configureDatabase(database: DatabaseConnection): void {
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.pragma('journal_mode = WAL');
}
