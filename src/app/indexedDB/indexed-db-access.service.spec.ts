import { of } from 'rxjs';
import { vi } from 'vitest';
import { IndexedDbAccessService } from './indexed-db-access.service';

describe('IndexedDbAccessService', () => {
  it('returns indexed records in ascending local key order', async () => {
    const dbService = {
      getAllByIndex: vi.fn(() => of([
        { id: 30, guid: 'third' },
        { id: 10, guid: 'first' },
        { id: 20, guid: 'second' }
      ]))
    };
    const service = new IndexedDbAccessService(dbService as any);

    const records = await service.getAllByIndex('facilities', 'accountId', 'account-guid');

    expect(records.map(record => record.id)).toEqual([10, 20, 30]);
    expect(dbService.getAllByIndex).toHaveBeenCalledWith(
      'facilities',
      'accountId',
      'account-guid'
    );
  });

  it('selects the lowest local key when a non-unique GUID has duplicates', async () => {
    const dbService = {
      getAllByIndex: vi.fn(() => of([
        { id: 8, guid: 'duplicate-guid' },
        { id: 3, guid: 'duplicate-guid' }
      ]))
    };
    const service = new IndexedDbAccessService(dbService as any);

    await expect(service.getByGuid('accounts', 'duplicate-guid')).resolves.toEqual({
      id: 3,
      guid: 'duplicate-guid'
    });
  });

  it('deletes records through an indexed relationship', async () => {
    const dbService = {
      deleteAllByIndex: vi.fn(() => of(undefined))
    };
    const service = new IndexedDbAccessService(dbService as any);

    await service.deleteAllByIndex('facilityReports', 'facilityId', 'facility-guid');

    expect(dbService.deleteAllByIndex).toHaveBeenCalledWith(
      'facilityReports',
      'facilityId',
      'facility-guid'
    );
  });
});
