import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { EnergyUsesModule } from '../energy-uses.module';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUsesInventoryComponent } from './energy-uses-inventory.component';
import { buildEnergyUseInventory } from './energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem } from '../energy-uses.testing';

describe('energy uses inventory', () => {
  function setup() {
    const scope = signal<string | undefined>(undefined);
    const state = signal('ready');
    const entries = signal(buildEnergyUseInventory('account-a', [energyUseFacility(), energyUseFacility('facility-b')],
      Array.from({ length: 26 }, (_, index) => energyUseItem({ guid: `energy-${index}`, name: `Pump ${String(25 - index).padStart(2, '0')}`, facilityId: index === 0 ? 'facility-b' : 'facility-a' })), [energyUseGroup()]));
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [provideRouter([]),
      { provide: WorkspaceNavigationService, useValue: { inventoryFacilityGuid: scope, isSingleSiteWorkspace: () => false,
        accountPortfolioRoute: () => ['/inventory'], facilityInventoryLink: (facility: string) => ({ route: ['/inventory'], queryParams: { facility } }), changeFacilityScope: vi.fn() } }] });
    TestBed.overrideComponent(EnergyUsesInventoryComponent, { set: { providers: [{ provide: EnergyUsesWorkspaceService, useValue: {
      account: signal({ guid: 'account-a' }), entries, state, loading: () => state() === 'loading', ready: () => state() === 'ready'
    } }] } });
    const fixture = TestBed.createComponent(EnergyUsesInventoryComponent); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, scope, state, entries };
  }
  it('sorts the complete scope before paging and restores per-scope filter/page/detail state', () => {
    const { fixture, component, scope } = setup();
    expect(component.inventory.visibleTiles()).toHaveLength(24);
    expect(component.inventory.visibleTiles()[0].name).toBe('Pump 00');
    component.inventory.selectPage(1); component.inventory.detailControl.setValue('summary'); fixture.detectChanges();
    expect(component.inventory.visibleTiles()).toHaveLength(2);
    scope.set('facility-a'); fixture.detectChanges();
    expect(component.entries()).toHaveLength(25); expect(component.inventory.page()).toBe(0);
    component.filtersForm.controls.search.setValue('Pump 00'); fixture.detectChanges();
    expect(component.filteredEntries()).toHaveLength(1);
    scope.set(undefined); fixture.detectChanges();
    expect(component.filters().search).toBe(''); expect(component.inventory.page()).toBe(1); expect(component.inventory.detail()).toBe('summary');
    scope.set('facility-a'); fixture.detectChanges(); expect(component.filters().search).toBe('Pump 00');
    fixture.destroy();
    expect(TestBed.inject(BrowseStateService).readFilters({ accountGuid: 'account-a', facilityGuid: 'facility-a', kind: 'energy-uses' })?.search).toBe('Pump 00');
  });
  it('renders loading, load errors, empty and no-match states independently', () => {
    const { fixture, component, state, entries } = setup();
    state.set('loading'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Loading energy uses');
    state.set('error'); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    state.set('ready'); component.filtersForm.controls.search.setValue('missing'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No energy uses match');
    component.clearFilters(); entries.set([]); fixture.detectChanges(); fixture.detectChanges(); expect(fixture.nativeElement.innerHTML).toContain('No energy uses');
  });
  it('reports rejected navigation', async () => {
    const { fixture, component } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockRejectedValue(new Error('failed'));
    component.navigateRoute(['/missing']); await Promise.resolve(); await Promise.resolve(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('could not be opened');
  });
});
