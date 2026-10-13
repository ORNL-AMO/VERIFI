import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { PortfolioFacilityService } from '../portfolio-facility.service';
import { AccountPortfolioFacilitiesTabComponent } from './account-portfolio-facilities-tab.component';

describe('AccountPortfolioFacilitiesTabComponent', () => {
  it('renders facility cards with whole-tile links for v1-backed facts', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const firstCard = fixture.nativeElement.querySelector('.v1-facility-card') as HTMLElement;
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card').length).toBe(2);
    expect(text).toContain('Alpha Plant');
    expect(text).toContain('Beta Works');
    expect(text).toContain('Energy Uses');
    expect(firstCard.textContent).not.toContain('Readings');
    expect(fixture.nativeElement.querySelector('.v1-facility-card__chips')).toBeNull();
    expect(firstCard.querySelector('.v1-facility-card__header .v1-facility-card__status')).toBeNull();
    expect(firstCard.querySelector('.v1-facility-card__header .v1-facility-card__location')).toBeNull();
    expect(firstCard.querySelector('.v1-facility-card__context .v1-facility-card__status')).not.toBeNull();
    expect(firstCard.querySelector('.v1-facility-card__context .v1-facility-card__location')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Set up');
    expect(fixture.nativeElement.querySelectorAll('.v1-select')).toHaveLength(2);
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-facility-card__status')).map(chip => chip.textContent?.trim())).toEqual([
      '1 error'
    ]);
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card__title app-ui-icon[name="facility"]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card__title-chevron').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card__footer .v1-facility-card__actions').length).toBe(2);
    expect((fixture.nativeElement.querySelectorAll('.v1-facility-card__fact-label')[0] as HTMLElement).textContent?.trim()).toBe('Meters');
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card__fact-value app-ui-icon').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Meters"].v1-facility-card__fact')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Readings"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Predictors"].v1-facility-card__fact')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Energy Uses"].v1-facility-card__fact')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Analyses"].v1-facility-card__fact')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Reports"]')).toBeNull();
  });

  it('owns facility search, status filtering, and sort order', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(cardTitles(fixture)).toEqual(['Beta Works', 'Alpha Plant']);

    fixture.componentInstance.setSearch('alpha');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Alpha Plant']);

    fixture.componentInstance.setSearch('');
    fixture.componentInstance.setStatusFilter('noMeters');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Beta Works']);

    fixture.componentInstance.setStatusFilter('all');
    fixture.componentInstance.setSortBy('facilityName');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Alpha Plant', 'Beta Works']);
  });

  it('shows active errors and warnings only, including child records, and hides stale evaluation details', () => {
    const fixture = setup();
    const status = TestBed.inject(WorkspaceStatusService);
    const warning = presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', {
      kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a'
    }, { latestPeriod: '2026-01', thresholdMonths: 3 }));
    const unrelated = { ...warning, id: 'other-facility', entity: { ...warning.entity, facilityGuid: 'facility-other' } };
    (status.items as ReturnType<typeof signal<StatusItem[]>>).set([warning, unrelated]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.v1-facility-card__status')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.v1-facility-card__status').textContent).toContain('1 warning');
    fixture.componentInstance.filtersForm.controls.status.setValue('warning');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Alpha Plant']);
    (status.state as ReturnType<typeof signal<string>>).set('evaluating');
    fixture.componentInstance.filtersForm.controls.status.setValue('all');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-facility-card__status')).toBeNull();
  });

  it('navigates linked facts to facility data and analyses and owns facility deletion', async () => {
    const fixture = setup();
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    const workspaceService = TestBed.inject(AccountWorkspaceService) as unknown as { selectFacility: ReturnType<typeof vi.fn> };
    const modalPortal = TestBed.inject(ModalPortalService) as unknown as { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
    const portfolioFacilities = TestBed.inject(PortfolioFacilityService) as unknown as { deleteFacility: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Energy Uses"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[aria-label="Open Alpha Plant Analyses"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[aria-label="Delete facility"]') as HTMLButtonElement).click();

    expect(workspaceService.selectFacility).toHaveBeenCalledWith('facility-a');
    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'energy-uses']);
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'dashboard']);
    expect(fixture.componentInstance.facilityToDelete()?.guid).toBe('facility-b');
    expect(modalPortal.show).toHaveBeenCalled();
    expect(portfolioFacilities.deleteFacility).not.toHaveBeenCalled();

    await fixture.componentInstance.confirmDeleteFacility();

    expect(portfolioFacilities.deleteFacility).toHaveBeenCalledWith(expect.objectContaining({ guid: 'facility-b' }));
    expect(modalPortal.hide).toHaveBeenCalled();
    expect(fixture.componentInstance.actionMessage).toBe('Facility deleted');
  });
});

function setup(): ComponentFixture<AccountPortfolioFacilitiesTabComponent> {
  const facilities = signal([facilityFixture('facility-a', 'Alpha Plant'), facilityFixture('facility-b', 'Beta Works')]);

  TestBed.configureTestingModule({
    imports: [
      RouterModule.forRoot([]),
      AccountDataModule
    ],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          facilities,
          meters: signal([{ guid: 'meter-a', facilityId: 'facility-a', source: 'Electricity', modifiedDate: new Date('2026-02-01') }]),
          meterData: signal([{ guid: 'reading-a', facilityId: 'facility-a', meterId: 'meter-a', modifiedDate: new Date('2026-02-02') }]),
          predictors: signal([{ guid: 'predictor-a', facilityId: 'facility-a' }]),
          predictorData: signal([]),
          facilityAnalyses: signal([{ guid: 'analysis-a', facilityId: 'facility-a', modifiedDate: new Date('2026-02-03') }]),
          facilityReports: signal([{ guid: 'report-a', facilityId: 'facility-a' }]),
          energyUseEquipment: signal([{ guid: 'equipment-a', facilityId: 'facility-a' }]),
          canWrite: signal(true),
          hasPending: signal(false)
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          openFacility: vi.fn(async () => undefined),
          facilitySettingsRoute: (facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail],
          facilityDataRoute: (facilityGuid: string, detail = 'meters') => ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail],
          facilityAnalysisRoute: (facilityGuid: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'dashboard']
        }
      },
      { provide: WorkspaceStatusService, useValue: {
        state: signal('ready'), items: signal([presentFinding(makeFinding('facility.meters.missing', 'error', 'readiness', {
          kind: 'facility', guid: 'facility-b', name: 'Beta Works', accountGuid: 'account-a', facilityGuid: 'facility-b'
        }))])
      } },
      { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
      { provide: PortfolioFacilityService, useValue: { deleteFacility: vi.fn(async () => undefined) } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } }
    ]
  });

  return TestBed.createComponent(AccountPortfolioFacilitiesTabComponent);
}

function cardTitles(fixture: ComponentFixture<AccountPortfolioFacilitiesTabComponent>): string[] {
  return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.v1-facility-card__title'))
    .map(button => button.textContent!.trim());
}

function facilityFixture(guid: string, name: string): IdbFacility {
  return {
    guid,
    accountId: 'account-a',
    name,
    city: guid === 'facility-a' ? 'Oak Ridge' : 'Knoxville',
    state: 'TN',
    country: 'US',
    classification: guid === 'facility-a' ? 'Manufacturing' : 'Office',
    modifiedDate: new Date('2026-01-01')
  } as IdbFacility;
}
