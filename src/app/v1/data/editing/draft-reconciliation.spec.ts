import { draftEqual, reconcileFields, reconcileKeyedItems } from './draft-reconciliation';

describe('Data draft reconciliation', () => {
  it('merges nonconflicting fields and compares properties independently of object key order', () => {
    const result = reconcileFields({ name: 'Original', notes: 'Old' }, { name: 'Mine', notes: 'Old' }, { notes: 'Saved', name: 'Original' });
    expect(result).toEqual({ value: { name: 'Mine', notes: 'Saved' }, conflicts: [], baseline: { name: 'Original', notes: 'Saved' } });
    expect(draftEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it('treats coupled setup values as one conflict and requires explicit resolution', () => {
    const base = { source: 'Gas', unit: 'SCF', notes: '' };
    const local = { ...base, source: 'Electricity', unit: 'kWh' };
    const saved = { ...base, unit: 'CCF', notes: 'New note' };
    const options = { groups: [{ id: 'setup', label: 'Meter setup', keys: ['source', 'unit'] as const }] };
    const result = reconcileFields(base, local, saved, options);
    expect(result.conflicts.map(item => item.id)).toEqual(['setup']);
    expect(result.value).toEqual({ ...local, notes: 'New note' });
    expect(reconcileFields(base, local, saved, { ...options, choices: { setup: 'saved' } })).toEqual({ value: saved, conflicts: [], baseline: saved });
  });

  it('matches rows by GUID across reordering, additions, and untouched deletions', () => {
    const base = [{ guid: 'a', amount: 1 }, { guid: 'b', amount: 2 }];
    const local = [{ guid: 'b', amount: 3 }, { guid: 'a', amount: 1 }];
    const saved = [{ guid: 'b', amount: 2 }, { guid: 'c', amount: 4 }];
    const result = reconcileKeyedItems(base, local, saved, row => row.guid,
      (b, l, s, prefix) => reconcileFields(b, l, s, { prefix }));
    expect(result).toEqual({ value: [{ guid: 'b', amount: 3 }, { guid: 'c', amount: 4 }], conflicts: [], baseline: saved });
  });

  it('keeps an edited deleted row for review and honors explicit saved deletion', () => {
    const base = [{ guid: 'a', amount: 1 }], local = [{ guid: 'a', amount: 0 }];
    const merge = (b: typeof base[0], l: typeof base[0], s: typeof base[0], prefix: string) => reconcileFields(b, l, s, { prefix });
    expect(reconcileKeyedItems(base, local, [], row => row.guid, merge).conflicts).toEqual([
      expect.objectContaining({ id: 'items.a', localValue: local[0], savedValue: undefined })
    ]);
    expect(reconcileKeyedItems(base, local, [], row => row.guid, merge, { 'items.a': 'saved' })).toEqual({ value: [], conflicts: [], baseline: [] });
  });

  it('accepts saved presentation order when the draft did not reorder existing rows', () => {
    const base = [{ guid: 'a', amount: 1 }, { guid: 'b', amount: 2 }];
    const saved = [...base].reverse();
    const result = reconcileKeyedItems(base, base, saved, row => row.guid,
      (b, l, s, prefix) => reconcileFields(b, l, s, { prefix }));
    expect(result).toEqual({ value: saved, conflicts: [], baseline: saved });
  });

  it('advances only nonconflicting fields and keyed rows across successive saved updates', () => {
    const base = [{ guid: 'a', amount: 1, note: '' }];
    const local = [{ ...base[0], amount: 2 }];
    const merge = (b: typeof base[0], l: typeof base[0], s: typeof base[0], prefix: string) => reconcileFields(b, l, s, { prefix });
    const first = reconcileKeyedItems(base, local, [{ guid: 'a', amount: 3, note: 'First' }], row => row.guid, merge);
    const second = reconcileKeyedItems(first.baseline!, first.value, [{ guid: 'a', amount: 3, note: 'Second' }], row => row.guid, merge);
    expect(second.value).toEqual([{ guid: 'a', amount: 2, note: 'Second' }]);
    expect(second.conflicts.map(item => item.id)).toEqual(['items.a.amount']);
    expect(second.baseline).toEqual([{ guid: 'a', amount: 1, note: 'Second' }]);
  });
});
