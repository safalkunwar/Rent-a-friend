import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ write: vi.fn(), uid: vi.fn(() => 'A') }));
vi.mock('../services/firestore', () => ({ firestore: { setDocument: mocks.write } }));
vi.mock('../services/identity', () => ({ requireUid: mocks.uid }));
import { sosService } from '../services/sos';
beforeEach(() => { vi.clearAllMocks(); mocks.uid.mockReturnValue('A'); });
it('writes canonical ownership without undefined booking fields', async () => {
  mocks.write.mockResolvedValue('saved');
  const id = await sosService.createAlert({ severity: 'critical' });
  expect(mocks.write).toHaveBeenCalledWith(`sosAlerts/${id}`, expect.objectContaining({ userId: 'A', severity: 'critical', status: 'active' }));
  expect(mocks.write.mock.calls[0][1]).not.toHaveProperty('bookingId');
});
it('does not acknowledge failed persistence', async () => {
  mocks.write.mockRejectedValue(new Error('Denied'));
  await expect(sosService.createAlert({ severity: 'critical' })).rejects.toThrow('Denied');
});
it('does not write for unregistered identities', async () => {
  mocks.uid.mockImplementationOnce(() => { throw new Error('Sign in'); });
  await expect(sosService.createAlert({ severity: 'critical' })).rejects.toThrow('Sign in');
  expect(mocks.write).not.toHaveBeenCalled();
});
