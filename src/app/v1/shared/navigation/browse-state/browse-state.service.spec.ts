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
  it('isolates lists, accounts and facilities, with an explicit direct-link origin fallback', () => {
    const store = new BrowseStateService();
    store.setOrigin('a', 'meters');
    expect(store.origin('a')).toBe('meters'); expect(store.origin('b')).toBe('facilities');
    store.saveFilters({ accountGuid: 'a', kind: 'facilities' }, { search: 'Plant', status: 'all', sort: 'attention' });
    expect(store.readFilters({ accountGuid: 'a', kind: 'meters' })).toBeUndefined();
    expect(store.readFilters({ accountGuid: 'b', kind: 'facilities' })).toBeUndefined();
    store.saveFacilityView({ accountGuid: 'a', kind: 'facilityMeters', facilityGuid: 'f1' }, { page: 2, expanded: true, zoom: { start: 20, end: 80 } });
    expect(store.readFacilityView({ accountGuid: 'a', kind: 'facilityMeters', facilityGuid: 'f2' })).toBeUndefined();
    expect(new BrowseStateService().origin('a')).toBe('facilities');
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
    fixture.componentInstance.account.set('b'); fixture.detectChanges();
    expect(fixture.componentInstance.filters().search).toBe('');
    fixture.componentInstance.account.set('a'); fixture.detectChanges();
    expect(fixture.componentInstance.filters().search).toBe('Edited');
    fixture.destroy();
    expect(store.readFilters({ accountGuid: 'a', kind: 'facilities' })?.search).toBe('Edited');
  });
});
