import { TestBed } from '@angular/core/testing';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { setupFacilityScopeNavigation } from '@app/v1/shell/facility-scope-navigation.testing';
import { InventoryGridComponent } from './inventory-grid/inventory-grid.component';
import { InventoryTile } from './inventory.models';
import { facilityTiles } from '@app/v1/data/inventory/data-inventory-tiles.view';
import { buildFacilityInventory, FacilityInventoryInput } from '@app/v1/data/facilities/inventory/facility-inventory.view';

describe('inventory facility header links', () => {
  it.each(['title', 'meters', 'predictors'] as const)('opens a filtered inventory from the facility card %s link', async linkKind => {
    TestBed.configureTestingModule({ imports: [InventoryGridComponent] });
    const url = '/v1/workspace/account/account-a/data/portfolio/facilities';
    const view = await setupFacilityScopeNavigation(url);
    const input: FacilityInventoryInput = { facilities: view.store.facilities(), meters: [], predictors: [],
      meterData: [], predictorData: [], equipment: [], findings: [], statusState: 'ready' };
    const tiles = facilityTiles(buildFacilityInventory(input), input, view.navigation);
    const tile = tiles[0];
    const grid = TestBed.createComponent(InventoryGridComponent);
    grid.componentRef.setInput('tiles', [tile]); grid.componentRef.setInput('printTiles', []);
    grid.componentRef.setInput('detail', 'summary'); grid.detectChanges();
    let transition: Promise<boolean> | undefined;
    grid.componentInstance.facilityInventoryRequested.subscribe(destination => {
      transition = view.navigation.changeFacilityScope({ kind: 'facility', facilityGuid: destination.facilityGuid }, destination.resource);
    });
    const resource = linkKind === 'title' ? 'meters' : linkKind;
    const link = linkKind === 'title' ? grid.nativeElement.querySelector('.portfolio-tile__name') as HTMLAnchorElement
      : [...(grid.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.facility-snapshot__resource')].find(item => item.textContent?.toLowerCase().includes(linkKind))!;
    const target = `/v1/workspace/account/account-a/data/portfolio/${resource}?facility=${tile.guid}`;
    expect(link.getAttribute('href')).toBe(target);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    link.dispatchEvent(modified); expect(modified.defaultPrevented).toBe(false); expect(transition).toBeUndefined();
    const discard = vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmDiscard').mockReturnValue(false);
    link.click(); expect(await transition).toBe(false); expect(view.router.url).toBe(url);
    discard.mockReturnValue(true);
    link.click(); expect(await transition).toBe(true); view.fixture.detectChanges(); await view.fixture.whenStable();
    expect(view.router.url).toBe(target); expect(view.navigation.inventoryFacilityGuid()).toBe(tile.guid);
    expect(view.workspaceService.selectFacility).not.toHaveBeenCalled();
    grid.destroy(); view.fixture.destroy();
  });
  it.each(['meters', 'predictors', 'analysis', 'reports'] as const)('filters %s in place through guarded scope navigation', async resource => {
    TestBed.configureTestingModule({ imports: [InventoryGridComponent] });
    const path = resource === 'analysis' || resource === 'reports' ? `${resource}/dashboard` : `data/portfolio/${resource}`;
    const url = `/v1/workspace/account/account-a/${path}`;
    const view = await setupFacilityScopeNavigation(url);
    const owner = { label: 'Plant A', facilityGuid: 'facility-a', ...view.navigation.facilityInventoryLink('facility-a', resource) };
    const tile: InventoryTile = { guid: 'item', name: 'Item', icon: 'meter', route: ['/workbench'], owner,
      status: { tone: 'success', icon: 'success', label: 'All data valid' } };
    const grid = TestBed.createComponent(InventoryGridComponent);
    grid.componentRef.setInput('tiles', [tile]); grid.componentRef.setInput('printTiles', []); grid.detectChanges();
    let transition: Promise<boolean> | undefined;
    grid.componentInstance.facilityScopeRequested.subscribe(guid => {
      transition = view.navigation.changeFacilityScope({ kind: 'facility', facilityGuid: guid });
    });
    const link = grid.nativeElement.querySelector('app-inventory-card-header a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(`${url}?facility=facility-a`);
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(modified); expect(modified.defaultPrevented).toBe(false); expect(transition).toBeUndefined();

    const discard = vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmDiscard').mockReturnValue(false);
    link.click(); expect(await transition).toBe(false);
    expect(view.router.url).toBe(url); expect(view.navigation.inventoryFacilityGuid()).toBeUndefined();
    discard.mockReturnValue(true);
    vi.spyOn(view.router, 'navigate').mockRejectedValueOnce(new Error('Unavailable'));
    link.click(); expect(await transition).toBe(false);
    expect(view.router.url).toBe(url); expect(view.navigation.inventoryFacilityGuid()).toBeUndefined();

    link.click(); expect(await transition).toBe(true); view.fixture.detectChanges(); await view.fixture.whenStable();
    expect(view.router.url).toBe(`${url}?facility=facility-a`);
    expect(view.navigation.inventoryFacilityGuid()).toBe('facility-a');
    expect(view.workspaceService.selectFacility).not.toHaveBeenCalled();
    grid.destroy(); view.fixture.destroy();
  });
});
