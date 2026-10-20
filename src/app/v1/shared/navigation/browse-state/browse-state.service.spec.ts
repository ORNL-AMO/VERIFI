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
    store.saveFacilityView({ accountGuid: 'a', kind: 'facilityMeters', facilityGuid: 'f1' }, { page: 2, zoom: { start: 20, end: 80 } });
    expect(store.readFacilityView({ accountGuid: 'a', kind: 'facilityMeters', facilityGuid: 'f2' })).toBeUndefined();
    expect(new BrowseStateService().origin('a')).toBe('facilities');
  });
  it('copies facility card detail overrides and zoom without sharing mutable browse state', () => {
    const store = new BrowseStateService(), key = { accountGuid: 'a', kind: 'facilityMeters' as const, facilityGuid: 'f' };
    const overrides = { m: 'detailed' as const }, zoom = { start: 10, end: 70 };
    store.saveFacilityView(key, { page: 2, detail: 'summary', overrides, zoom });
    zoom.start = 40; delete (overrides as Record<string, string>)['m'];
    expect(store.readFacilityView(key)).toMatchObject({ page: 2, detail: 'summary', overrides: { m: 'detailed' }, zoom: { start: 10, end: 70 } });
    const restored = store.readFacilityView(key)!; (restored.zoom as { start: number }).start = 50;
    expect(store.readFacilityView(key)?.zoom.start).toBe(10);
  });
  it('keeps Predictor controls and previews isolated from Meters, other facilities and other accounts', () => {
    const store = new BrowseStateService(); store.setOrigin('a', 'predictors');
    store.saveFilters({ accountGuid: 'a', kind: 'predictors' }, { search: 'Weather', type: 'weather', status: 'attention', sort: 'latestReading' });
    store.savePredictorView({ accountGuid: 'a', kind: 'facilityPredictors', facilityGuid: 'f1' }, { page: 2, expanded: true, previewGuid: 'p1', zoom: { start: 20, end: 80 } });
    expect(store.origin('a')).toBe('predictors'); expect(store.origin('b')).toBe('facilities');
    expect(store.readFilters({ accountGuid: 'a', kind: 'meters' })).toBeUndefined();
    expect(store.readPredictorView({ accountGuid: 'a', kind: 'facilityPredictors', facilityGuid: 'f2' })).toBeUndefined();
    expect(store.readPredictorView({ accountGuid: 'b', kind: 'facilityPredictors', facilityGuid: 'f1' })).toBeUndefined();
    expect(store.readPredictorView({ accountGuid: 'a', kind: 'facilityPredictors', facilityGuid: 'f1' })?.previewGuid).toBe('p1');
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
