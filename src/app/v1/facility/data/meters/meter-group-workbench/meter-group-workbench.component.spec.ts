import { CommonModule } from '@angular/common';
import { Directive, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { MeterGroupResultsView, MeterUsageFactsView } from '@app/v1/facility/data/meters/models';
import { account, facility, group, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterGroupWorkbenchComponent } from './meter-group-workbench.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { AccountBrowseOrigin } from '@app/v1/shared/navigation/browse-state/browse-state.service';

describe('MeterGroupWorkbenchComponent', () => {
  it('renders calendarized usage facts in the selected group header', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const breadcrumb = fixture.nativeElement.querySelector('[aria-label="Data context"]') as HTMLElement;
    expect(text).toContain('Account A');
    expect(breadcrumb.textContent).toContain('Facility A');
    expect(breadcrumb.textContent).not.toContain('Meter Grouping');
    expect(breadcrumb.textContent).not.toContain('Energy Group');
    expect(fixture.nativeElement.querySelector('.v1-meter-group-workbench-header .v1-eyebrow')).toBeNull();
    expect(fixture.componentInstance.breadcrumbs()[0].route).toEqual([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio',
      'facilities'
    ]);
    expect(text).toContain('Energy Group');
    expect(fixture.debugElement.query(By.css('app-page-identity h1 > app-ui-icon')).componentInstance.name).toBe('meterGroupItem');
    expect(fixture.debugElement.query(By.css('.v1-meter-group-workbench-header__type-chip app-ui-icon')).componentInstance.name).toBe('meterGroupItem');
    expect(text).toContain('Meters');
    expect(text).toContain('Electric Main');
    expect(text).toContain('Gas Backup');
    expect(text).not.toContain('Total Energy');
    expect(text).not.toContain('Total cost');
    expect(text).toContain('Usage values shown in MMBtu/month');
    expect(text).toContain('Dec 2026');
    expect(text).toContain('110');
    expect(text).toContain('+10% vs same month last year');
    expect(text).toContain('Dec 2025');
    expect(text).toContain('100');
    expect(text).toContain('AVG. Jan 2026 - Dec 2026');
    expect(text).toContain('+10% vs previous 12 mo');
    expect(text).toContain('AVG. Jan 2025 - Dec 2025');
    expect(text).not.toContain('110 MMBtu');
  });

  it('renders usage fact placeholders while calendarized group values are loading', () => {
    const fixture = setup({ calendarizationState: 'loading' });

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Calculating');
    expect(element.textContent).toContain('Calculating Dec 2026');
    expect(element.querySelectorAll('.placeholder-glow .placeholder').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('110 MMBtu');
  });

  it('places the energy basis and facts controls in the header action row', async () => {
    const fixture = setup();

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const actions = element.querySelector<HTMLElement>('.v1-meter-group-workbench-header__chips');
    const basisControl = element.querySelector<HTMLElement>('.v1-meter-group-workbench-header__basis-control');
    const basisButtons = Array.from(basisControl?.querySelectorAll<HTMLButtonElement>('.v1-segmented__btn') ?? []);
    const factsToggle = element.querySelector<HTMLButtonElement>('.v1-meter-group-workbench-header__facts-toggle');
    const factsRegion = element.querySelector<HTMLElement>('#v1-meter-group-workbench-facts');

    expect(actions?.contains(basisControl)).toBe(true);
    expect(basisButtons.map(button => button.textContent?.trim())).toEqual(['Site', 'Source']);
    expect(basisButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(basisButtons[1]?.getAttribute('aria-pressed')).toBe('false');
    expect(actions?.lastElementChild?.contains(factsToggle ?? null)).toBe(true);
    expect(element.querySelector('.v1-meter-group-workbench-header__energy-toggle')).toBeNull();
    expect(factsToggle?.getAttribute('aria-controls')).toBe('v1-meter-group-workbench-facts');
    expect(factsToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(factsToggle?.textContent).toContain('Hide facts');
    expect(factsRegion?.hidden).toBe(false);

    basisButtons[1]?.click();
    await fixture.whenStable();

    const facilityHandler = TestBed.inject(FacilityCommandHandler) as unknown as { update: ReturnType<typeof vi.fn> };
    expect(facilityHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'facility-a', energyIsSource: true }),
      'account-a'
    );

    factsToggle?.click();
    fixture.detectChanges();

    expect(factsToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(factsToggle?.textContent).toContain('Show facts');
    expect(factsRegion?.hidden).toBe(true);
    expect(getComputedStyle(factsRegion as HTMLElement).display).toBe('none');
    expect(element.querySelector('app-page-identity h1')?.textContent).toContain('Energy Group');
    expect(element.querySelector('[aria-label="Meter group workbench sections"]')).not.toBeNull();
  });

  it('shows group switcher menu items as names only', () => {
    const fixture = setup({
      extraGroups: [
        group({ guid: 'group-water', name: 'Water Group', groupType: 'Water' })
      ]
    });

    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.v1-data-workbench-switcher-toggle')?.click();
    fixture.detectChanges();

    const menu = element.querySelector<HTMLElement>('.v1-data-workbench-switcher-menu');
    const menuItems = Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-data-workbench-switcher-item'));
    expect(menu).not.toBeNull();
    expect(menu?.querySelector('app-ui-icon')).toBeNull();
    expect(menuItems.map(item => item.textContent?.trim())).toEqual(['Energy Group', 'Water Group']);
  });
  it.each(['facilities','meters','predictors'] as const)('links account context to the %s origin and facility context to meter grouping', origin => {
    const fixture=setup({origin});fixture.detectChanges();
    const links=fixture.nativeElement.querySelectorAll('app-page-identity nav a') as NodeListOf<HTMLAnchorElement>;
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe(`/v1/workspace/account/account-a/data/portfolio/${origin}`);
    expect(links[1].getAttribute('href')).toBe('/v1/workspace/facility/facility-a/data/meter-grouping');
    const router=TestBed.inject(Router), navigate=vi.spyOn(router,'navigateByUrl').mockResolvedValue(true);
    links[1].click();expect(router.serializeUrl(navigate.mock.calls[0][0] as UrlTree)).toBe('/v1/workspace/facility/facility-a/data/meter-grouping');
  });
});

@Directive({
  selector: 'router-outlet',
  standalone: false
})
class RouterOutletStubDirective { }

function setup(options: {
  results?: MeterGroupResultsView;
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
  extraGroups?: ReturnType<typeof group>[];
  origin?: AccountBrowseOrigin;
} = {}): ComponentFixture<MeterGroupWorkbenchComponent> {
  const selectedGroup = group({ guid: 'group-energy', name: 'Energy Group', groupType: 'Energy' });
  const factsExpanded = signal(true);

  TestBed.configureTestingModule({
    declarations: [
      MeterGroupWorkbenchComponent,
      RouterOutletStubDirective
    ],
    imports: [
      CommonModule,
      DataWorkbenchFactsToggleComponent,
      DataWorkbenchResourceSwitcherComponent,
      IconComponent,
      PageIdentityComponent
    ],
    providers: [
      provideRouter([]),
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(account()),
          facility: signal(facility({ guid: 'facility-a', name: 'Facility A', energyIsSource: false })),
          selectedMeterGroupForWorkbench: signal(selectedGroup),
          meterGroups: signal([selectedGroup, ...(options.extraGroups ?? [])]),
          selectedMeterGroupResults: signal(options.results ?? resultsView()),
          calendarizationState: signal(options.calendarizationState ?? 'ready'),
          canWrite: signal(true),
          hasPending: signal(false),
          hasMeterGroupRoute: signal(true)
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityDataRoute: (facilityGuid: string, detail = 'meter-grouping') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            detail
          ],
          accountDataRoute: (accountGuid: string, detail = 'portfolio') => [
            '/v1',
            'workspace',
            'account',
            accountGuid,
            'data',
            detail
          ],
          accountDataReturnRoute: (accountGuid: string) => ['/v1','workspace','account',accountGuid,'data','portfolio',options.origin ?? 'facilities'],
          facilityMeterGroupRoute: (facilityGuid: string, groupGuid: string, tab = 'monthly-table') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            'meter-grouping',
            groupGuid,
            tab
          ]
        }
      },
      {
        provide: WorkbenchLayoutService,
        useValue: {
          factsExpanded,
          toggleFacts: () => factsExpanded.update(expanded => !expanded)
        }
      },
      {
        provide: WorkspaceCommandBoundary,
        useValue: { execute: vi.fn((_command: unknown, action: () => Promise<unknown>) => action()) }
      },
      { provide: FacilityCommandHandler, useValue: { update: vi.fn() } },
    ]
  });
  vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  return TestBed.createComponent(MeterGroupWorkbenchComponent);
}

function resultsView(options: Partial<MeterGroupResultsView> = {}): MeterGroupResultsView {
  const selectedGroup = group({ guid: 'group-energy', name: 'Energy Group', groupType: 'Energy' });
  const electricMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: selectedGroup.guid });
  const gasMeter = meter({ guid: 'meter-gas', name: 'Gas Backup', source: 'Natural Gas', groupId: selectedGroup.guid });
  return {
    group: selectedGroup,
    assignedMeters: [
      { meter: electricMeter, group: selectedGroup, readingCount: 24 },
      { meter: gasMeter, group: selectedGroup, readingCount: 24 }
    ],
    calendarizedMeters: [],
    monthlyRows: [{ periodKey: '2026-11', periodLabel: 'Dec 2026', sortValue: new Date(2026, 11, 1).getTime(), fiscalYear: 2026, energyUse: 110, energyConsumption: 0, energyCost: 0 }],
    yearlyRows: [],
    showEnergyUse: true,
    showConsumption: false,
    showCost: true,
    utilityLabel: 'Total Energy',
    utilityUnit: 'MMBtu',
    summary: {
      assignedMeterCount: 2,
      firstDataLabel: 'Jan 2025',
      latestDataLabel: 'Dec 2026',
      utilityTotalLabel: '2,520',
      utilityTotalValue: 2520,
      costTotalLabel: '$0.00',
      costTotalValue: 0
    },
    usageFacts: usageFactsView(),
    ...options
  };
}

function usageFactsView(options: Partial<MeterUsageFactsView> = {}): MeterUsageFactsView {
  return {
    facts: [
      { id: 'latest-month', label: 'Dec 2026', valueLabel: '110', unavailable: false, changeLabel: '+10% vs same month last year', changeTone: 'increase' },
      { id: 'previous-year-month', label: 'Dec 2025', valueLabel: '100', unavailable: false },
      { id: 'latest-twelve-month-average', label: 'AVG. Jan 2026 - Dec 2026', valueLabel: '110', unavailable: false, changeLabel: '+10% vs previous 12 mo', changeTone: 'increase' },
      { id: 'previous-twelve-month-average', label: 'AVG. Jan 2025 - Dec 2025', valueLabel: '100', unavailable: false }
    ],
    unitLabel: 'MMBtu',
    ...options
  };
}
