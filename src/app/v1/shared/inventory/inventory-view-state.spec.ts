import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { LocalStorageService } from 'ngx-webstorage';
import { BrowseFilters, BrowseKey, BrowseStateService, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { InventoryViewState } from './inventory-view-state';
import type { DataInventoryResource } from '@app/v1/data/inventory/data-inventory.models';

import { portfolioTile } from './inventory.testing';

@Component({ standalone: true, template: '' })
class InventoryStateHost {
  readonly account = signal('a'); readonly resource = signal<DataInventoryResource>('meters');
  readonly key = computed<BrowseKey<DataInventoryResource>>(() => ({ accountGuid: this.account(), kind: this.resource() }));
  readonly all = signal(Array.from({ length: 60 }, (_, index) => portfolioTile(String(index))));
  readonly filter = signal(''); readonly loaded = signal(true);
  readonly visible = computed(() => this.all().filter(item => !this.filter() || item.guid === this.filter()));
  readonly state = new InventoryViewState(this.key, this.visible, computed(() => this.all().map(item => item.guid)), this.filter, this.loaded);
}

@Component({ standalone: true, template: '' })
class ScopedInventoryHost {
  readonly facilityGuid = signal<string | undefined>(undefined);
  readonly key = computed<BrowseKey<'facilities'>>(() => ({ kind: 'facilities', accountGuid: 'a', facilityGuid: this.facilityGuid() }));
  readonly form = new FormGroup({ search: new FormControl('', { nonNullable: true }),
    status: new FormControl<BrowseFilters['facilities']['status']>('all', { nonNullable: true }),
    sort: new FormControl<BrowseFilters['facilities']['sort']>('facilityName', { nonNullable: true }) });
  readonly filters = rememberBrowseForm(this.key, this.form);
  readonly tiles = signal(Array.from({ length: 60 }, (_, index) => portfolioTile(String(index))));
  readonly state = new InventoryViewState(this.key, this.tiles, computed(() => this.tiles().map(tile => tile.guid)), this.filters, signal(true));
}

describe('account inventory session state', () => {
  it('restores each scope’s filters, page, detail and exceptions together without a hydration reset', () => {
    TestBed.configureTestingModule({ imports: [ScopedInventoryHost], providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }] });
    const fixture = TestBed.createComponent(ScopedInventoryHost); fixture.detectChanges();
    const host = fixture.componentInstance, state = host.state;
    host.form.controls.search.setValue('All view'); fixture.detectChanges();
    state.detailControl.setValue('summary'); state.selectPage(2); state.setTileDetail({ guid: '50', level: 'detailed' });
    host.facilityGuid.set('facility-a'); fixture.detectChanges();
    expect(host.filters().search).toBe(''); expect(state.page()).toBe(0);
    host.form.controls.search.setValue('Plant A view'); fixture.detectChanges();
    state.detailControl.setValue('detailed'); state.selectPage(1);
    host.facilityGuid.set('facility-b'); fixture.detectChanges();
    expect(host.filters().search).toBe(''); expect(state.page()).toBe(0);
    host.facilityGuid.set('facility-a'); fixture.detectChanges();
    expect(host.filters().search).toBe('Plant A view'); expect(state.page()).toBe(1); expect(state.detail()).toBe('detailed');
    host.facilityGuid.set(undefined); fixture.detectChanges();
    expect(host.filters().search).toBe('All view'); expect(state.page()).toBe(2); expect(state.detail()).toBe('summary');
    expect(state.overrides()).toEqual({ '50': 'detailed' });
  });
  function setup() {
    TestBed.configureTestingModule({ imports: [InventoryStateHost], providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }] });
    const fixture = TestBed.createComponent(InventoryStateHost); fixture.detectChanges(); return fixture;
  }
  it('pages 24 items, resets on criteria changes, clamps after deletion, and retains filtered-out overrides', () => {
    const fixture = setup(), host = fixture.componentInstance, state = host.state;
    expect(state.visibleTiles()).toHaveLength(24); expect(state.pages()).toBe(3);
    state.selectPage(2); expect(state.visibleTiles()).toHaveLength(12); expect(state.start()).toBe(49);
    state.setTileDetail({ guid: '50', level: 'detailed' }); host.filter.set('1'); fixture.detectChanges();
    expect(state.page()).toBe(0); expect(state.overrides()['50']).toBe('detailed');
    host.filter.set(''); fixture.detectChanges(); state.selectPage(2);
    host.all.update(items => items.slice(0, 25)); fixture.detectChanges();
    expect(state.page()).toBe(1); expect(state.visibleTiles()).toHaveLength(1); expect(state.overrides()).toEqual({});
  });
  it('changes the screen level without losing the page and clears every individual exception', () => {
    const fixture = setup(), state = fixture.componentInstance.state;
    state.selectPage(1); state.setTileDetail({ guid: '27', level: 'detailed' }); state.detailControl.setValue('summary'); fixture.detectChanges();
    expect(state.page()).toBe(1); expect(state.detail()).toBe('summary'); expect(state.overrides()).toEqual({});
  });
  it('isolates account/screens and restores page and overrides before the return position is ready', () => {
    const fixture = setup(), host = fixture.componentInstance, state = host.state;
    state.selectPage(2); state.setTileDetail({ guid: '50', level: 'detailed' }); state.detailControl.setValue('summary'); state.setTileDetail({ guid: '50', level: 'detailed' });
    host.resource.set('predictors'); fixture.detectChanges(); expect(state.page()).toBe(0); expect(state.detail()).toBe('simple');
    host.resource.set('meters'); fixture.detectChanges(); expect(state.page()).toBe(2); expect(state.overrides()['50']).toBe('detailed'); expect(state.detail()).toBe('summary');
    host.account.set('b'); fixture.detectChanges(); expect(state.overrides()).toEqual({}); expect(state.page()).toBe(0);
    fixture.destroy();
    const returned = TestBed.createComponent(InventoryStateHost); returned.detectChanges();
    expect(returned.componentInstance.state.ready()).toBe(true); expect(returned.componentInstance.state.page()).toBe(2); expect(returned.componentInstance.state.visibleIds()).toContain('50');
    expect(new BrowseStateService().readInventoryView({ kind: 'meters', accountGuid: 'a' })).toBeUndefined();
  });
  it('does not prune saved overrides during an unloaded account transition', () => {
    const fixture = setup(), host = fixture.componentInstance;
    host.state.setTileDetail({ guid: '50', level: 'detailed' }); host.loaded.set(false); host.all.set([]); fixture.detectChanges();
    expect(host.state.overrides()['50']).toBe('detailed');
  });
});
