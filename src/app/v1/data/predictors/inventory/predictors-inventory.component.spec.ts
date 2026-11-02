import { InventoryHeaderActionsRegistry } from '@app/v1/data/inventory/inventory-header-actions.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { inventoryNavigation, inventoryWorkspace, inventoryReading } from './predictor-inventory.testing';
import { DataModule } from '@app/v1/data/data.module';
import { PredictorsInventoryComponent } from './predictors-inventory.component';

describe('account Predictor inventory', () => {
  it('scopes predictors and printed tiles before local filtering without a duplicate facility control', () => {
    const workspace = inventoryWorkspace(5);
    const scope = signal<string | undefined>('other');
    workspace.predictors.update(items => items.map(item => item.guid === 'p1' ? { ...item, facilityId: 'other' } : item));
    TestBed.configureTestingModule({ imports: [DataModule], providers: [InventoryHeaderActionsRegistry, provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { ...workspace, facilities: signal([workspace.facility()!, { ...workspace.facility()!, guid: 'other', name: 'Other' }]), predictorData: workspace.predictorReadings } },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: workspace.statusState } },
      { provide: WorkspaceNavigationService, useValue: { ...inventoryNavigation, inventoryFacilityGuid: scope } }
    ] });
    const fixture = TestBed.createComponent(PredictorsInventoryComponent); fixture.detectChanges();
    expect(fixture.componentInstance.entries().map(item => item.guid)).toEqual(['p1']);
    expect(fixture.componentInstance.tiles()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[formControlName="facilityGuid"]')).toBeNull();
    fixture.componentInstance.clearFilters(); fixture.detectChanges();
    expect(scope()).toBe('other');
    scope.set(undefined); fixture.detectChanges();
    expect(fixture.componentInstance.entries()).toHaveLength(5);
  });

  it('counts individual tiles, combines filters and opens canonical weather routes', () => {
    const workspace = inventoryWorkspace(5);
    const facilities = signal([workspace.facility()!, { ...workspace.facility()!, guid: 'other', name: 'Other' }]);
    workspace.predictors.update(items => items.map(item => item.guid === 'p1' ? { ...item, facilityId: 'other' } : item));
    TestBed.configureTestingModule({ imports: [DataModule], providers: [InventoryHeaderActionsRegistry, provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { ...workspace, facilities, predictorData: workspace.predictorReadings } },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: workspace.statusState } },
      { provide: WorkspaceNavigationService, useValue: inventoryNavigation }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PredictorsInventoryComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.entries()).toHaveLength(5); expect(new Set(component.entries().map(item => item.facility.guid)).size).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Showing 5 of 5 predictors');
    expect(fixture.nativeElement.querySelector('app-resource-browse-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Select predictors"]')).toBeNull();
    component.filtersForm.patchValue({ search: 'p2', type: 'weather', status: 'clear' }); fixture.detectChanges();
    expect(component.filteredEntries().map(item => item.guid)).toEqual(['p2']);
    component.inventory.detailControl.setValue('detailed');fixture.detectChanges();
    workspace.predictorReadings.update(items=>[...items,inventoryReading('p2',{guid:'latest',year:2026,month:2,amount:0})]);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reading-snapshot__reading-heading strong')?.textContent).toBe('2');
    expect(fixture.nativeElement.querySelector('.reading-snapshot__recent-reading')?.textContent).toContain('0 HDD');
    expect(fixture.nativeElement.querySelector('.reading-snapshot__range')?.textContent).toBe('Jan 2025 – Feb 2026');
    (fixture.nativeElement.querySelector('.portfolio-inventory .portfolio-tile__name') as HTMLAnchorElement).click(); expect(navigate).toHaveBeenCalledWith(inventoryNavigation.facilityWeatherPredictorRoute('facility', 'station:KORD'));
    component.filtersForm.controls.type.setValue('standard'); fixture.detectChanges(); expect(component.filteredEntries()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No predictors match these filters');
    component.clearFilters(); fixture.detectChanges(); (fixture.nativeElement.querySelector('.portfolio-tile__name[data-browse-id="p1"]') as HTMLAnchorElement).click();
    expect(navigate).toHaveBeenLastCalledWith(inventoryNavigation.facilityPredictorRoute('other', 'p1', 'settings'));
    fixture.destroy(); const returned = TestBed.createComponent(PredictorsInventoryComponent); returned.detectChanges();
    expect(returned.componentInstance.entries()).toHaveLength(5);
  });
});
