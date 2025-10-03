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
    expect(created.email).toBe(emp.email);
  });

  it('fetches an employee by id', async () => {
    const emp = await repo.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '08098765432',
      account_number: '9876543210',
      bank_code: '033',
      salary_amount: 300000
    } as any);

    const fetched = await repo.getById((emp as any).id);
    expect(fetched).not.toBeNull();
    expect((fetched as any).email).toBe('jane@example.com');
  });

  it('lists employees', async () => {
    const list = await repo.list();
    expect(Array.isArray(list)).toBe(true);
  });
});