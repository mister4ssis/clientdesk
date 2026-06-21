import type { CustomerRepository } from './customer.repository';

export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  isReady(): boolean {
    return this.customerRepository.exists();
  }
}
