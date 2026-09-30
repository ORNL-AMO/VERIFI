import { ImportSessionService } from './import-session.service';

describe('ImportSessionService', () => {
  it('keeps a multi-file queue and advances only to ready files', () => {
    const service = new ImportSessionService();
    service.addDrafts([
      { id: 'first', status: 'ready' },
      { id: 'invalid', status: 'invalid' },
      { id: 'second', status: 'ready' }
    ] as any);

    expect(service.nextReady()?.id).toBe('first');
    service.complete('first', { affectedFacilityGuids: ['facility-a'] } as any);
    expect(service.nextReady('first')?.id).toBe('second');
    expect(service.hasUnsavedChanges()).toBe(true);
  });

  it('clears transient drafts, origin, and completion summary together', () => {
    const service = new ImportSessionService();
    service.setOrigin({ facilityGuid: 'facility-a', returnUrl: '/return' });
    service.addDrafts([{ id: 'draft', status: 'ready' }] as any);
    service.complete('draft', { affectedFacilityGuids: [] } as any);

    service.clear();

    expect(service.drafts()).toEqual([]);
    expect(service.origin()).toEqual({});
    expect(service.summary()).toBeUndefined();
  });
});
