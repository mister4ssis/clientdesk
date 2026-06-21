import type { DatabaseConnection } from '../../database/database';

export class CustomerRepository {
  constructor(private readonly database: DatabaseConnection) {}

  exists(): boolean {
    const row = this.database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get('customers');

    return row !== undefined;
  }
}
