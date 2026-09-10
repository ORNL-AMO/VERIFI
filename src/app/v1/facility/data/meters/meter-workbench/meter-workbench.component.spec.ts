import { Directive, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { MeterCardView, MeterWorkbenchTabId } from '../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { group, meter } from '../facility-meters.testing';
import { MeterWorkbenchTabsComponent } from './meter-workbench-tabs/meter-workbench-tabs.component';
import { MeterWorkbenchComponent } from './meter-workbench.component';

describe('MeterWorkbenchComponent', () => {
  it('renders the selected meter header and active workbench tab from the child route', () => {
    const fixture = setup({ tab: 'monthly' });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Monthly Data');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('Facility A Meter');
    expect(text).not.toContain('1 readings');
    const monthlyButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => button.textContent?.includes('Monthly Data'));
    expect(monthlyButton?.getAttribute('aria-current')).toBe('page');
  });

  it('renders breadcrumb and card-derived meter status summary in the header', () => {
    const fixture = setup({
      selectedMeterCard: {
        meter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Other Fuels' }),
        group: group({ guid: 'group-energy', name: 'Purchased Electricity' }),
        readingCount: 8,
        sourceColor: '#a59a04',
        statusLabel: 'Needs review',
        statusTone: 'warning',
        statusIcon: 'fa-triangle-exclamation',
        firstReadingLabel: 'Dec 2025',
        latestReadingLabel: 'Jan 2026',
        scopeLabel: 'Stationary combustion',
        fuelLabel: 'Biomass',
        statusIssueLabels: ['No calendarization'],
        statusActionSummaries: ['A calendarization method is required.']
      }
    });

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent;
    expect(element.querySelector('[aria-label="Meter breadcrumb"]')?.textContent).toContain('Meters');
    expect(element.querySelector('[aria-label="Meter breadcrumb"]')?.textContent).toContain('Electric Main');
    expect(text).toContain('Facility A Meter');
    expect(text).toContain('Other Fuels');
    expect(text).toContain('Needs review');
    expect(text).toContain('First reading');
    expect(text).toContain('Dec 2025');
    expect(text).toContain('Latest');
    expect(text).toContain('Jan 2026');
    expect(text).toContain('Scope');
    expect(text).toContain('Stationary combustion');
    expect(text).toContain('Fuel');
    expect(text).toContain('Biomass');
    expect(text).toContain('Group');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('No calendarization');
    expect(text).toContain('A calendarization method is required.');
    expect(text).not.toContain('8 readings');
    expect(element.querySelector('.v1-meter-workbench-header__source-chip')?.getAttribute('style')).toContain('#a59a04');
    expect(element.querySelector('.v1-meter-workbench-header__status .fa-triangle-exclamation')).not.toBeNull();
    expect(element.querySelector('.v1-meter-workbench-header__group-value .fa-layer-group')).not.toBeNull();
  });

  it('navigates back to meters and between workbench tabs', () => {
    const fixture = setup({ tab: 'settings' });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.trim() === 'Meters')?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters'
    ]);

    buttons.find(button => button.textContent?.includes('Quality Report'))?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-electric',
      'quality'
    ]);
  });

  it('switches meters from the current breadcrumb and preserves the active tab', () => {
    const gasCard: MeterCardView = {
      meter: meter({ guid: 'meter-gas', name: 'Gas Backup', source: 'Natural Gas' }),
      readingCount: 2,
      sourceColor: '#d16a22',
      statusLabel: 'Valid',
      statusTone: 'success',
      statusIcon: 'fa-circle-check',
      firstReadingLabel: 'Jan 2026',
      latestReadingLabel: 'Feb 2026',
      scopeLabel: 'Stationary combustion',
      statusIssueLabels: [],
      statusActionSummaries: []
    };
    const fixture = setup({ tab: 'monthly', meterCards: [defaultMeterCard(), gasCard] });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.v1-meter-workbench-header__meter-toggle')?.click();
    fixture.detectChanges();

    const menu = element.querySelector<HTMLElement>('.v1-meter-workbench-header__meter-menu');
    const meterItems = Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-workbench-header__meter-item'));
    expect(menu).not.toBeNull();
    expect(meterItems.map(item => item.textContent?.trim())).toEqual(['Electric Main', 'Gas Backup']);
    expect(meterItems[0].getAttribute('aria-checked')).toBe('true');
    expect(menu?.querySelector('.fa-check')).toBeNull();

    meterItems[1].click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-gas',
      'monthly'
    ]);
  });

  it('updates the active tab when child route data changes', () => {
    const fixture = setup({ tab: 'settings' });
    const route = TestBed.inject(ActivatedRoute) as unknown as {
      firstChild?: { snapshot: { data: { meterTab?: MeterWorkbenchTabId } } };
    };
    const router = TestBed.inject(Router) as unknown as {
      events: Subject<NavigationEnd>;
    };

    fixture.detectChanges();
    route.firstChild = { snapshot: { data: { meterTab: 'yearly' } } };
    router.events.next(new NavigationEnd(1, '/yearly', '/yearly'));
    fixture.detectChanges();

    const yearlyButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => button.textContent?.includes('Yearly Data'));
    expect(yearlyButton?.getAttribute('aria-current')).toBe('page');
  });

  it('defaults to settings while the child tab route is not ready', () => {
    const fixture = setup({ childRoute: {} });

    expect(() => fixture.detectChanges()).not.toThrow();

    const settingsButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => button.textContent?.includes('Settings'));
    expect(settingsButton?.getAttribute('aria-current')).toBe('page');
  });

  it('renders a not-found state for a missing or foreign meter route', () => {
    const fixture = setup({ selectedMeter: undefined, hasMeterRoute: true });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Meter not found');
    expect(text).toContain('This meter is not available in Facility A.');
  });

  it('suppresses workspace availability messaging for settings autosave', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).not.toContain('Meter actions are unavailable');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).not.toContain('Another workspace update is still finishing');
  });

  it('shows pending messaging for non-settings workbench tabs', () => {
    const fixture = setup({ hasPending: true, tab: 'readings' });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Another workspace update is still finishing');
  });

  it('shows workspace unavailable messaging for non-settings workbench tabs', () => {
    const fixture = setup({ canWrite: false, tab: 'readings' });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meter actions are unavailable');
  });
});

@Directive({
  selector: 'router-outlet',
  standalone: false
})
class RouterOutletStubDirective { }

function setup(options: {
  tab?: MeterWorkbenchTabId;
  childRoute?: { snapshot?: { data?: { meterTab?: MeterWorkbenchTabId } } };
  selectedMeter?: ReturnType<typeof meter>;
  selectedMeterCard?: MeterCardView;
  meterCards?: MeterCardView[];
  hasMeterRoute?: boolean;
  canWrite?: boolean;
  hasPending?: boolean;
} = {}): ComponentFixture<MeterWorkbenchComponent> {
  const selectedMeter = signal(options.selectedMeter === undefined && options.hasMeterRoute
    ? undefined
    : options.selectedMeter ?? meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy' })
  );
  const selectedMeterGroup = signal(group({ guid: 'group-energy', name: 'Purchased Electricity' }));
  const selectedMeterValue = selectedMeter();
  const selectedMeterCard = signal<MeterCardView | undefined>(options.selectedMeterCard ?? (selectedMeterValue ? defaultMeterCard(selectedMeterValue) : undefined));
  const meterCards = signal(options.meterCards ?? (selectedMeterCard() ? [selectedMeterCard() as MeterCardView] : []));
  const selectedMeterReadingCount = signal(1);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const hasMeterRoute = signal(options.hasMeterRoute ?? true);
  const routerEvents = new Subject<NavigationEnd>();

  TestBed.configureTestingModule({
    declarations: [
      MeterWorkbenchComponent,
      MeterWorkbenchTabsComponent,
      RouterOutletStubDirective
    ],
    imports: [CommonModule],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          selectedMeter,
          selectedMeterCard,
          meterCards,
          selectedMeterGroup,
          selectedMeterReadingCount,
          canWrite,
          hasPending,
          hasMeterRoute
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityDataRoute: (facilityGuid: string, detail = 'meters') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            detail
          ],
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: MeterWorkbenchTabId = 'settings') => [
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
      { provide: Router, useValue: { navigate: vi.fn(), events: routerEvents } },
      {
        provide: ActivatedRoute,
        useValue: {
          firstChild: options.childRoute ?? (options.tab ? { snapshot: { data: { meterTab: options.tab } } } : undefined)
        }
      }
    ]
  });

  return TestBed.createComponent(MeterWorkbenchComponent);
}

function defaultMeterCard(cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy' })): MeterCardView {
  return {
    meter: cardMeter,
    group: group({ guid: 'group-energy', name: 'Purchased Electricity' }),
    readingCount: 1,
    sourceColor: '#4f83cc',
    statusLabel: 'Valid',
    statusTone: 'success',
    statusIcon: 'fa-circle-check',
    firstReadingLabel: 'Jan 2026',
    latestReadingLabel: 'Jan 2026',
    scopeLabel: 'Purchased Electricity',
    statusIssueLabels: [],
    statusActionSummaries: []
  };
}
