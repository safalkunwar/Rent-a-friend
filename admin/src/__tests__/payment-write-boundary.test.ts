import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('../services/firestore', () => ({ firestore: { updateDocument: mocks.update } }));
vi.mock('../services/audit', () => ({ auditService: {} }));
vi.mock('../services/admin', () => ({ adminService: {} }));
import { AdminRepository } from '../repositories/AdminRepository';

it('refuses arbitrary payment status changes before any Firestore write', async () => {
  const repository = new AdminRepository();
  for (const status of ['pending', 'completed', 'verified', 'failed', 'refunded']) {
    await expect(repository.updatePaymentStatus('payment', status)).rejects.toThrow('verified provider evidence');
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
