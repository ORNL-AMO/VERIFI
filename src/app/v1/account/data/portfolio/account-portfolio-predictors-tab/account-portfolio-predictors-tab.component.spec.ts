import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { inventoryNavigation, inventoryWorkspace } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.testing';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioPredictorsTabComponent } from './account-portfolio-predictors-tab.component';

describe('account Predictor inventory', () => {
  it('counts individual predictors, combines filters, groups facilities and opens canonical weather routes', () => {
    const workspace = inventoryWorkspace(5);
    const facilities = signal([workspace.facility()!, { ...workspace.facility()!, guid: 'other', name: 'Other' }]);
    workspace.predictors.update(items => items.map(item => item.guid === 'p1' ? { ...item, facilityId: 'other' } : item));
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { ...workspace, facilities, predictorData: workspace.predictorReadings } },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: workspace.statusState } },
      { provide: WorkspaceNavigationService, useValue: inventoryNavigation }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountPortfolioPredictorsTabComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.entries()).toHaveLength(5); expect(component.facilityGroups()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Showing 5 of 5 predictors');
    expect(fixture.nativeElement.querySelector('app-resource-browse-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Select predictors"]')).toBeNull();
    component.filtersForm.patchValue({ search: 'p2', type: 'weather', status: 'clear' }); fixture.detectChanges();
    expect(component.filteredEntries().map(item => item.guid)).toEqual(['p2']);
    component.open({ guid: 'p2', action: 'settings' }); expect(navigate).toHaveBeenCalledWith(inventoryNavigation.facilityWeatherPredictorRoute('facility', 'station:KORD'));
    component.filtersForm.controls.type.setValue('standard'); fixture.detectChanges(); expect(component.filteredEntries()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No predictors match these filters');
    component.clearFilters(); fixture.detectChanges(); component.open({ guid: 'p1', action: 'settings' });
    expect(navigate).toHaveBeenLastCalledWith(inventoryNavigation.facilityPredictorRoute('other', 'p1', 'settings'));
    fixture.destroy(); const returned = TestBed.createComponent(AccountPortfolioPredictorsTabComponent); returned.detectChanges();
    expect(returned.componentInstance.entries()).toHaveLength(5);
  });
});
