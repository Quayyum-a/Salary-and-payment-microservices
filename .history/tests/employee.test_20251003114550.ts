
import { EmployeeRepository } from '../src/models/employee';

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeAll(() => {
    repo = new EmployeeRepository();
  });

  afterAll(async () => {
    // cleanup if needed in future (e.g., delete created test records)
  });

  it('creates an employee', async () => {
    const emp = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '08012345678',
      account_number: '0123456789',
      bank_code: '057',
      salary_amount: 500000
    };

    const created = await repo.create(emp as any);
    expect(created).toHaveProperty('id');
