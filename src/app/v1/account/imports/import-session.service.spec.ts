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
    service.begin({ facilityGuid: 'facility-a', returnUrl: '/return' });
    service.addDrafts([{ id: 'draft', status: 'ready' }] as any);
    service.complete('draft', { affectedFacilityGuids: [] } as any);

    service.clear();

    expect(service.drafts()).toEqual([]);
    expect(service.origin()).toEqual({});
    expect(service.summary('draft')).toBeUndefined();
  });

  it('keeps completion summaries associated with their files', () => {
    const service = new ImportSessionService();
    service.addDrafts([
      { id: 'first', status: 'ready' },
      { id: 'second', status: 'ready' }
    ] as any);

    service.complete('first', { affectedFacilityGuids: ['facility-a'] } as any);
    service.complete('second', { affectedFacilityGuids: ['facility-b', 'facility-c'] } as any);

    expect(service.summary('first')?.affectedFacilityGuids).toEqual(['facility-a']);
    expect(service.summary('second')?.affectedFacilityGuids).toEqual(['facility-b', 'facility-c']);
  });

  it('resets stale origin only when beginning an empty session', () => {
    const service = new ImportSessionService();
    service.begin({ facilityGuid: 'facility-a', returnUrl: '/facility-a' });
    service.begin({});
    expect(service.origin()).toEqual({});

    service.addDrafts([{ id: 'draft', status: 'ready' }] as any);
    service.begin({ facilityGuid: 'facility-b', returnUrl: '/facility-b' });
    expect(service.origin()).toEqual({});
  });
});
