import type {
  CustomerAuditFiltersDto,
  CustomerAuditListResultDto
} from '@shared/audit/audit.types';
import { customerAuditFiltersSchema } from '@shared/audit/audit.schemas';
import { customerIdSchema } from '@shared/customers/customer.schemas';
import type { CustomerAuditRepository } from './customer-audit.repository';

export class CustomerAuditService {
  constructor(
    private readonly repository: CustomerAuditRepository,
    private readonly getCurrentUserId: () => string
  ) {}

  listByCustomer(
    customerId: string,
    filters: CustomerAuditFiltersDto = {}
  ): CustomerAuditListResultDto {
    const parsedCustomerId = customerIdSchema.parse(customerId);
    const parsedFilters = customerAuditFiltersSchema.parse(filters);

    return this.repository.listByCustomer(parsedCustomerId, {
      ...parsedFilters,
      userId: this.getCurrentUserId()
    });
  }

  countByCustomer(customerId: string): number {
    const parsedCustomerId = customerIdSchema.parse(customerId);

    return this.repository.countByCustomer(parsedCustomerId, this.getCurrentUserId());
  }

  deleteOlderThan(date: string): number {
    return this.repository.deleteOlderThan(date);
  }
}
