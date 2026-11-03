import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BrowseFilters, BrowseKey, BrowseStateService, rememberBrowseForm } from './browse-state.service';

@Component({ standalone: true, template: '' })
class FormHost {
  readonly account = signal('a');
  readonly key = computed<BrowseKey<'facilities'>>(() => ({ kind: 'facilities', accountGuid: this.account() }));
  readonly form = new FormGroup({ search: new FormControl('', { nonNullable: true }), status: new FormControl<BrowseFilters['facilities']['status']>('all', { nonNullable: true }), sort: new FormControl<BrowseFilters['facilities']['sort']>('facilityName', { nonNullable: true }) });
  readonly filters = rememberBrowseForm(this.key, this.form);
}

describe('session browse state', () => {
  it('isolates lists, accounts and facilities', () => {
    const store = new BrowseStateService();
    store.saveFilters({ accountGuid: 'a', kind: 'facilities' }, { search: 'Plant', status: 'all', sort: 'attention' });
    expect(store.readFilters({ accountGuid: 'a', kind: 'meters' })).toBeUndefined();
    expect(store.readFilters({ accountGuid: 'b', kind: 'facilities' })).toBeUndefined();
    store.saveInventoryView({ accountGuid: 'a', kind: 'meters', facilityGuid: 'f1' }, { page: 2, overrides: {} });
    expect(store.readInventoryView({ accountGuid: 'a', kind: 'meters', facilityGuid: 'f2' })).toBeUndefined();
  });
  it('copies scoped inventory card overrides without sharing mutable state', () => {
    const store = new BrowseStateService(), key = { accountGuid: 'a', kind: 'meters' as const, facilityGuid: 'f' };
    const overrides = { m: 'detailed' as const };
    store.saveInventoryView(key, { page: 2, detail: 'summary', overrides });
    delete (overrides as Record<string, string>)['m'];
    expect(store.readInventoryView(key)).toEqual({ page: 2, detail: 'summary', overrides: { m: 'detailed' } });
    (store.readInventoryView(key)!.overrides as Record<string, string>)['m'] = 'simple';
    expect(store.readInventoryView(key)!.overrides['m']).toBe('detailed');
  });

  it('hydrates without emitting edits, restores account-specific filters, and saves on destroy', () => {
    TestBed.configureTestingModule({ imports: [FormHost] });
    const store = TestBed.inject(BrowseStateService);
    store.saveFilters({ accountGuid: 'a', kind: 'facilities' }, { search: 'Saved', status: 'all', sort: 'facilityName' });
    const fixture = TestBed.createComponent(FormHost);
    const changes = vi.fn(); fixture.componentInstance.form.valueChanges.subscribe(changes);
    fixture.detectChanges();
    expect(fixture.componentInstance.filters().search).toBe('Saved'); expect(changes).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.search.setValue('Edited'); fixture.detectChanges();
    fixture.componentInstance.form.controls.sort.setValue('attention'); fixture.detectChanges();
    fixture.componentInstance.account.set('b'); fixture.detectChanges();
    expect(fixture.componentInstance.filters().search).toBe('');
    fixture.componentInstance.account.set('a'); fixture.detectChanges();
    expect(fixture.componentInstance.filters().search).toBe('Edited');
    expect(fixture.componentInstance.filters().sort).toBe('attention');
    fixture.destroy();
    expect(store.readFilters({ accountGuid: 'a', kind: 'facilities' })?.search).toBe('Edited');
  });

  it('restores remembered sort choices on synchronous projection, account changes, and reopening without emitting edits', () => {
    TestBed.configureTestingModule({ imports: [FormHost] });
    const store = TestBed.inject(BrowseStateService);
    store.saveFilters({ accountGuid: 'a', kind: 'facilities' }, { search: 'Saved', status: 'warning', sort: 'attention' });
    store.saveFilters({ accountGuid: 'b', kind: 'facilities' }, { search: 'Other', status: 'error', sort: 'modified' });
    const fixture = TestBed.createComponent(FormHost);
    const host = fixture.componentInstance;
    const changes = vi.fn(); host.form.valueChanges.subscribe(changes);
    expect(host.filters()).toEqual({ search: 'Saved', status: 'warning', sort: 'attention' });
    fixture.detectChanges();
    expect(host.form.getRawValue()).toEqual(host.filters());
    expect(changes).not.toHaveBeenCalled();
    host.form.controls.sort.setValue('modified');
    expect(host.filters().sort).toBe('modified');
    host.account.set('b');
    expect(host.filters()).toEqual({ search: 'Other', status: 'error', sort: 'modified' });
    fixture.detectChanges();
    host.account.set('a'); fixture.detectChanges();
    expect(host.filters()).toEqual({ search: 'Saved', status: 'warning', sort: 'modified' });
    host.form.controls.sort.setValue('attention');
    fixture.destroy();
    const reopened = TestBed.createComponent(FormHost); reopened.detectChanges();
    expect(reopened.componentInstance.form.getRawValue()).toEqual({ search: 'Saved', status: 'warning', sort: 'attention' });
  });
});
