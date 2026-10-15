import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioFacilitiesTabComponent } from './account-portfolio-facilities-tab.component';

function facility(guid: string, name: string, city: string): IdbFacility {
  return { guid, name, accountId: 'account-a', country: 'US', city, state: 'TN', zip: '37830', classification: 'Manufacturing' } as IdbFacility;
}

function setup() {
  const account = signal({ guid: 'account-a' });
  const facilities = signal([facility('alpha', 'Alpha Plant', 'Oak Ridge'), facility('beta', 'Beta Works', 'Knoxville')]);
  const navigate = vi.fn(async () => true);
  const items = signal<readonly StatusItem[]>([]);
  const statusState = signal('ready');
  TestBed.configureTestingModule({ imports: [RouterModule.forRoot([]), AccountDataModule], providers: [
    { provide: AccountWorkspaceStore, useValue: {
      account, facilities, meters: signal([{ facilityId: 'alpha' }]), meterData: signal([]), predictors: signal([]), predictorData: signal([]),
      facilityAnalyses: signal([]), facilityReports: signal([]), energyUseEquipment: signal([])
    } },
    { provide: WorkspaceStatusService, useValue: { state: statusState, items } },
    { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
    { provide: WorkspaceNavigationService, useValue: {
      accountSettingsRoute: (guid: string) => ['/v1/workspace/account', guid, 'settings/portfolio'],
      facilityDataRoute: (guid: string, detail: string) => ['/v1', 'workspace', 'facility', guid, 'data', detail]
    } },
  ] });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
  const fixture = TestBed.createComponent(AccountPortfolioFacilitiesTabComponent);
  fixture.detectChanges();
  return { fixture, account, facilities, navigate, statusState, items };
}

describe('AccountPortfolioFacilitiesTabComponent', () => {
  it('updates warnings filtering through the native select change event', async () => {
    const { fixture, items } = setup();
    items.set(presentFindings([
      makeFinding('facility.meters.missing', 'error', 'readiness', {
        kind: 'facility', guid: 'alpha', name: 'Alpha Plant', accountGuid: 'account-a', facilityGuid: 'alpha'
      }),
      makeFinding('facility.meters.missing', 'warning', 'readiness', {
        kind: 'facility', guid: 'beta', name: 'Beta Works', accountGuid: 'account-a', facilityGuid: 'beta'
      })
    ]));
    fixture.autoDetectChanges();
    const status = fixture.nativeElement.querySelector('select[formControlName="status"]') as HTMLSelectElement;
    status.value = 'warning';
    status.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    const entries = fixture.nativeElement.querySelectorAll('.facility-directory__entry');
    expect(entries).toHaveLength(1);
    expect(entries[0].textContent).toContain('Beta Works');
    expect(entries[0].getAttribute('data-tone')).toBe('warning');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Showing 1 of 2 facilities');
  });

  it('shows a searchable lightweight directory without map or view controls', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('.facility-directory__entry')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.facility-directory--single-column')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-facility-map')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=radio]')).toBeNull();
    component.filtersForm.controls.search.setValue('knoxville');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.facility-directory__entry')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Beta Works');
    expect(fixture.nativeElement.textContent).not.toContain('Last modified');
    expect(fixture.nativeElement.querySelector('.v1-facility-card__facts')).toBeNull();
    component.clearFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.facility-directory__entry')).toHaveLength(2);
  });

  it('retains setup filters, neutral status, empty state, and opens Facility Data > Meters', async () => {
    const { fixture, statusState, navigate } = setup();
    const component = fixture.componentInstance;
    component.filtersForm.controls.status.setValue('noMeters');
    statusState.set('error');
    fixture.detectChanges();
    const tile = fixture.nativeElement.querySelector('.facility-directory__entry') as HTMLButtonElement;
    expect(tile.textContent).toContain('Beta Works');
    expect(tile.textContent).toContain('Checks unavailable');
    tile.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'beta', 'data', 'meters']);
    component.filtersForm.controls.search.setValue('missing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No facilities match');
  });

  it('uses rows below five facilities and preserves the large-account directory while filtering', () => {
    const { fixture, facilities } = setup();
    expect(fixture.nativeElement.querySelector('.facility-directory--single-column')).not.toBeNull();
    facilities.update(current => [...current, facility('c', 'Gamma', 'Boston'), facility('d', 'Delta', 'Chicago'), facility('e', 'Epsilon', 'Seattle')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.facility-directory--single-column')).toBeNull();
    fixture.componentInstance.filtersForm.controls.search.setValue('alpha');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.facility-directory__entry')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.facility-directory--single-column')).toBeNull();
  });

});
