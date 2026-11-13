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

  it('removes only the requested queue entry and summary, preserving the upload origin and remaining drafts', () => {
    const service = new ImportSessionService();
    service.begin({ facilityGuid: 'facility-a' });
    service.addDrafts([{ id: 'ready', status: 'ready' }, { id: 'done', status: 'ready' }] as any);
    service.complete('done', { affectedFacilityGuids: ['facility-a'] } as any);
    expect(service.removeDraft('done')).toBe(true);
    expect(service.summary('done')).toBeUndefined();
    expect(service.drafts().map(draft => draft.id)).toEqual(['ready']);
    expect(service.origin()).toEqual({ facilityGuid: 'facility-a' });
    expect(service.hasUnsavedChanges()).toBe(true);
    expect(service.removeDraft('ready')).toBe(true);
    expect(service.hasUnsavedChanges()).toBe(false);
    expect(service.removeDraft('missing')).toBe(false);
  });

  it('does not remove saving files or discard a committed-refresh recovery receipt', () => {
    const service = new ImportSessionService();
    service.addDrafts([{ id: 'ready', status: 'ready' }, { id: 'saving', status: 'importing' },
      { id: 'recovery', status: 'ready', kind: 'energy-uses-template', energyUses: {} }] as any);
    service.setPending(true);
    expect(service.removeDraft('ready')).toBe(false);
    service.setPending(false);
    expect(service.removeDraft('saving')).toBe(false);
    service.updateDraft('recovery', draft => {
      if (draft.kind === 'energy-uses-template') draft.energyUses.recoverySummary = { affectedFacilityGuids: ['facility-a'] } as any;
    });
    expect(service.removeDraft('recovery')).toBe(false);
    expect(service.removeDraft('ready')).toBe(false);
    expect(service.drafts()).toHaveLength(3);
    expect(service.recoveryDraft()?.id).toBe('recovery');
  });

  it('blocks queue navigation while a committed Energy Uses import awaits refresh', () => {
    const service = new ImportSessionService();
    service.addDrafts([{ id: 'saved', status: 'ready', kind: 'energy-uses-template', energyUses: {
      recoverySummary: { affectedFacilityGuids: ['facility-a'] }
    } }] as any);
    expect(service.pending()).toBe(false);
    expect(service.navigationBlocked()).toBe(true);
    expect(service.recoveryDraft()?.id).toBe('saved');
    service.updateDraft('saved', draft => { if (draft.kind === 'energy-uses-template') draft.energyUses.recoverySummary = undefined; });
    expect(service.navigationBlocked()).toBe(false);
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
