import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { account, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountPortfolioMetersTabComponent } from './account-portfolio-meters-tab.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';

describe('AccountPortfolioMetersTabComponent', () => {
  it('renders account-wide meter cards with their owning facility headers', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelectorAll('app-meter-browse-card').length).toBe(2);
    expect(text).toContain('Alpha Plant');
    expect(text).toContain('Beta Works');
    expect(text).toContain('Main Electric');
    expect(text).toContain('City Water');
    expect(fixture.nativeElement.querySelectorAll('.v1-meter-browse-card__facility-header').length).toBe(2);
  });

  it('owns meter search, status filtering, and sort order', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(cardTitles(fixture)).toEqual(['Main Electric', 'City Water']);

    fixture.componentInstance.setSearch('beta');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['City Water']);

    fixture.componentInstance.setSearch('');
    fixture.componentInstance.setStatusFilter('missingGroup');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Main Electric']);

    fixture.componentInstance.setStatusFilter('valid');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['City Water']);

    fixture.componentInstance.setStatusFilter('all');
    fixture.componentInstance.setSortBy('facilityName');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Main Electric', 'City Water']);
  });

  it('opens meter routes through the card owning facility', () => {
    const fixture = setup();
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open City Water settings"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-b',
      'data',
      'meters',
      'meter-water',
      'settings'
    ]);
  });
});

function setup(): ComponentFixture<AccountPortfolioMetersTabComponent> {
  const facilities = signal([
    facilityFixture('facility-a', 'Alpha Plant'),
    facilityFixture('facility-b', 'Beta Works')
  ]);
  const electricFinding = presentFinding(makeFinding('meter.currency.stale', 'warning', 'currency', {
    kind: 'meter', guid: 'meter-electric', name: 'Main Electric', accountGuid: 'account-a', facilityGuid: 'facility-a'
  }, { latestPeriod: '2026-01', thresholdMonths: 3 }));

  TestBed.configureTestingModule({
    imports: [
      RouterModule.forRoot([]),
      AccountDataModule
    ],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal(account()),
          facilities,
          meters: signal([
            meter({ guid: 'meter-electric', name: 'Main Electric', source: 'Electricity', facilityId: 'facility-a', groupId: undefined }),
            meter({ guid: 'meter-water', name: 'City Water', source: 'Water Intake', facilityId: 'facility-b', groupId: 'group-water' })
          ]),
          meterData: signal([
            reading({ guid: 'reading-water', meterId: 'meter-water', facilityId: 'facility-b', month: 2, year: 2026 })
          ]),
          meterGroups: signal([
            group({ guid: 'group-water', name: 'Water', facilityId: 'facility-b', groupType: 'Water' })
          ]),
          canWrite: signal(true),
          hasPending: signal(false)
        }
      },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([electricFinding]) } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab = 'settings') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            'meters',
            meterGuid,
            tab
          ]
        }
      },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn() } },
      { provide: MeterCommandHandler, useValue: {} },
      { provide: MeterGroupCommandHandler, useValue: {} },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } }
    ]
  });

  return TestBed.createComponent(AccountPortfolioMetersTabComponent);
}

function cardTitles(fixture: ComponentFixture<AccountPortfolioMetersTabComponent>): string[] {
  return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-meter-browse-card__title-text'))
    .map(element => element.textContent!.trim());
}

function facilityFixture(guid: string, name: string): IdbFacility {
  return {
    guid,
    accountId: 'account-a',
    name,
    energyUnit: 'MMBtu',
    electricityUnit: 'kWh',
    volumeLiquidUnit: 'gal'
  } as IdbFacility;
}
