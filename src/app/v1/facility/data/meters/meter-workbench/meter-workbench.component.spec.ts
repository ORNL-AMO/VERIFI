import { Directive, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { MeterCardView, MeterUsageFactsView, MeterWorkbenchTabId } from '@app/v1/facility/data/meters/models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { account, facility, group, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterWorkbenchTabsComponent } from './meter-workbench-tabs/meter-workbench-tabs.component';
import { MeterWorkbenchComponent } from './meter-workbench.component';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem } from '@app/v1/status/status.models';

describe('MeterWorkbenchComponent', () => {
  it('renders the selected meter header and active workbench tab from the child route', () => {
    const fixture = setup({ tab: 'monthly', selectedMeter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', charges: [charge()] }) });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Monthly Table');
    expect(text).toContain('Bill Inspection');
    expect(text).toContain('Monthly Chart');
    expect(text).toContain('Purchased Electricity');
    expect(fixture.nativeElement.querySelector('.v1-eyebrow')).toBeNull();
    expect(text).not.toContain('1 readings');
    const monthlyButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => button.textContent?.includes('Monthly Table'));
    expect(monthlyButton?.getAttribute('aria-current')).toBe('page');
  });

  it('renders Bill Inspection as the active tab for eligible electricity meters', () => {
    const fixture = setup({
      tab: 'bill-inspection',
      selectedMeter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', charges: [charge()] })
    });

    fixture.detectChanges();

    const billInspectionButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => button.textContent?.includes('Bill Inspection'));
    expect(billInspectionButton?.getAttribute('aria-current')).toBe('page');
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
        statusIcon: 'warning',
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
    const breadcrumb = element.querySelector('[aria-label="Meter breadcrumb"]');
    expect(fixture.componentInstance.accountMetersRoute()).toEqual([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio',
      'meters'
    ]);
    expect(breadcrumb?.textContent).toContain('Account A');
    expect(breadcrumb?.textContent).toContain('Facility A');
    expect(breadcrumb?.textContent).toContain('Meters');
    expect(breadcrumb?.textContent).not.toContain('Electric Main');
    expect(breadcrumb?.querySelectorAll('app-ui-icon').length).toBe(2);
    expect(element.querySelector('.v1-meter-workbench-header__meter-title')?.textContent).toContain('Electric Main');
    expect(element.querySelector('.v1-eyebrow')).toBeNull();
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
    expect(text).toContain('A calendarization method is required.');
    expect(element.querySelector('.v1-meter-workbench-header__issues')).toBeNull();
    expect(text).not.toContain('8 readings');
    expect(element.querySelector('.v1-meter-workbench-header__source-chip')?.getAttribute('style')).toContain('#a59a04');
    expect(element.querySelector('.v1-meter-workbench-header__status app-ui-icon')).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.v1-meter-workbench-header__group-value app-ui-icon')).componentInstance.name).toBe('meterGroupItem');
  });

  it('renders calendarized usage facts in the selected meter header', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
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

  it('collapses and restores meter facts while keeping the heading and tabs available', () => {
    const fixture = setup({
      selectedMeterCard: {
        ...defaultMeterCard(),
        statusActionSummaries: ['A calendarization method is required.']
      }
    });

    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.v1-meter-workbench-header__facts-toggle');
    const factsRegion = element.querySelector<HTMLElement>('#v1-meter-workbench-facts');

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(toggle?.getAttribute('aria-controls')).toBe('v1-meter-workbench-facts');
    expect(toggle?.querySelector('.v1-meter-workbench-header__facts-symbol')?.textContent?.trim()).toBe('−');
    expect(factsRegion?.hidden).toBe(false);

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.textContent).toContain('Show facts');
    expect(toggle?.querySelector('.v1-meter-workbench-header__facts-symbol')?.textContent?.trim()).toBe('+');
    expect(factsRegion?.hidden).toBe(true);
    expect(getComputedStyle(factsRegion as HTMLElement).display).toBe('none');
    expect(element.querySelector('.v1-meter-workbench-header__status-notes')?.textContent)
      .toContain('A calendarization method is required.');
    expect(element.querySelector('.v1-meter-workbench-header__meter-title')?.textContent).toContain('Electric Main');
    expect(element.querySelector('app-meter-workbench-tabs')).not.toBeNull();

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(factsRegion?.hidden).toBe(false);
  });

  it('shows compact unit labels without facility-default helper content', () => {
    const fixture = setup();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#v1-meter-display-energy-unit');
    const actions = element.querySelector('.v1-meter-workbench-header__chips');
    const unitControl = element.querySelector('.v1-meter-workbench-header__unit-control');
    expect(select?.value).toBe('kWh');
    expect(Array.from(select?.options ?? []).every(option => option.value.length > 0)).toBe(true);
    expect(Array.from(select?.options ?? []).map(option => option.textContent?.trim())).toEqual(
      fixture.componentInstance.energyUnitOptions().map(option => option.value)
    );
    expect(unitControl?.textContent).not.toContain('Facility default');
    expect(unitControl?.querySelector('label')?.textContent).toContain('Displayed energy unit');
    expect(unitControl?.querySelector('label')?.classList.contains('visually-hidden')).toBe(true);
    expect(unitControl?.querySelector('label')?.getAttribute('for')).toBe('v1-meter-display-energy-unit');
    expect(actions?.textContent).toContain('Site');
    expect(actions?.textContent).toContain('Source');
    expect(actions?.textContent).not.toContain('Facility default');
    expect(actions?.lastElementChild?.previousElementSibling?.textContent).toContain('Hide facts');
  });

  it('selects the inherited facility energy unit on initial render', () => {
    const fixture = setup({
      facilityValue: facility({
        guid: 'facility-a', accountId: 'account-a', name: 'Facility A', energyUnit: 'MMBtu',
        volumeLiquidUnit: 'kgal', volumeGasUnit: 'CCF', massUnit: 'lb', energyIsSource: true
      })
    });

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#v1-meter-display-energy-unit');
    expect(select?.value).toBe('MMBtu');
    expect(select?.selectedOptions[0]?.textContent?.trim()).toBe('MMBtu');
  });

  it('persists meter display overrides and can restore the facility basis', async () => {
    const fixture = setup({
      selectedMeter: meter({
        guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', displayEnergyIsSource: true
      })
    });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeter: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.setDisplayEnergyUnit({ target: { value: 'GJ' } } as unknown as Event);
    await fixture.whenStable();

    expect(meterHandler.updateMeter).toHaveBeenCalledWith(expect.objectContaining({ displayEnergyUnit: 'GJ' }), 'account-a');

    meterHandler.updateMeter.mockClear();
    Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-workbench-header__basis-control button'))
      .find(button => button.textContent?.trim() === 'Site')
      ?.click();
    await fixture.whenStable();
    expect(meterHandler.updateMeter).toHaveBeenCalledWith(expect.not.objectContaining({ displayEnergyIsSource: expect.anything() }), 'account-a');
  });

  it('restores facility unit inheritance by selecting the facility unit', async () => {
    const fixture = setup({
      selectedMeter: meter({
        guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', displayEnergyUnit: 'GJ'
      })
    });
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeter: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    fixture.componentInstance.setDisplayEnergyUnit({ target: { value: 'kWh' } } as unknown as Event);
    await fixture.whenStable();

    expect(meterHandler.updateMeter).toHaveBeenCalledWith(expect.any(Object), 'account-a');
    expect(meterHandler.updateMeter.mock.calls[0][0]).not.toHaveProperty('displayEnergyUnit');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Use facility unit');
  });

  it('restores the effective unit when a display preference cannot be saved', async () => {
    const fixture = setup();
    const meterHandler = TestBed.inject(MeterCommandHandler) as unknown as { updateMeter: ReturnType<typeof vi.fn> };
    meterHandler.updateMeter.mockRejectedValueOnce(new Error('Display preference save failed.'));

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#v1-meter-display-energy-unit') as HTMLSelectElement;
    select.value = 'GJ';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(select.value).toBe('kWh');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Display preference save failed.');
  });

  it('hides energy display controls for a water meter', () => {
    const fixture = setup({ selectedMeter: meter({ guid: 'meter-water', source: 'Water Intake', startingUnit: 'gal' }) });

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#v1-meter-display-energy-unit')).toBeNull();
    expect(element.querySelector('.v1-meter-workbench-header__basis-control')).toBeNull();
  });

  it('uses the session workbench preference when the meter workbench is recreated', () => {
    const fixture = setup({ factsExpanded: false });

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.v1-meter-workbench-header__facts-toggle')?.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector<HTMLElement>('#v1-meter-workbench-facts')?.hidden).toBe(true);
    expect(element.querySelector('.v1-meter-workbench-header__meter-title')?.textContent).toContain('Electric Main');
    expect(element.querySelector('app-meter-workbench-tabs')).not.toBeNull();
  });

  it('renders usage fact placeholders while calendarized meter values are loading', () => {
    const fixture = setup({ calendarizationState: 'loading' });

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Dec 2026');
    expect(element.textContent).toContain('Calculating Dec 2026');
    expect(element.querySelectorAll('.placeholder-glow .placeholder').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('110 MMBtu');
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

  it('switches meters from the title dropdown and preserves the active tab', () => {
    const gasCard: MeterCardView = {
      meter: meter({ guid: 'meter-gas', name: 'Gas Backup', source: 'Natural Gas' }),
      readingCount: 2,
      sourceColor: '#d16a22',
      statusLabel: 'Valid',
      statusTone: 'success',
      statusIcon: 'success',
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
    expect(element.querySelector('[aria-label="Meter breadcrumb"]')?.textContent).not.toContain('Electric Main');
    expect(element.querySelector('.v1-meter-workbench-header__meter-title .v1-meter-workbench-header__meter-toggle')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.v1-meter-workbench-header__meter-toggle')?.click();
    fixture.detectChanges();

    const menu = element.querySelector<HTMLElement>('.v1-meter-workbench-header__meter-menu');
    const meterItems = Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-workbench-header__meter-item'));
    expect(menu).not.toBeNull();
    expect(meterItems.map(item => item.textContent?.trim())).toEqual(['Electric Main', 'Gas Backup']);
    expect(meterItems[0].getAttribute('aria-checked')).toBe('true');
    expect(menu?.querySelector('app-ui-icon')).toBeNull();

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

  it('hides Monthly Table, keeps Monthly Chart, and redirects direct monthly routes for meters that are not calendarized', () => {
    const fixture = setup({
      tab: 'monthly',
      selectedMeter: meter({
        guid: 'meter-electric',
        name: 'Electric Main',
        groupId: 'group-energy',
        meterReadingDataApplication: 'fullMonth'
      })
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find(button => button.textContent?.includes('Monthly Table'))).toBeUndefined();
    expect(buttons.find(button => button.textContent?.includes('Monthly Chart'))).not.toBeUndefined();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-electric',
      'readings'
    ], { replaceUrl: true });
  });

  it('hides Bill Inspection and redirects direct bill inspection routes for meters without electricity charges', () => {
    const fixture = setup({
      tab: 'bill-inspection',
      selectedMeter: meter({
        guid: 'meter-electric',
        name: 'Electric Main',
        groupId: 'group-energy',
        source: 'Electricity',
        charges: []
      })
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find(button => button.textContent?.includes('Bill Inspection'))).toBeUndefined();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-electric',
      'settings'
    ], { replaceUrl: true, fragment: 'meter-charges' });
  });

  it('switches to readings when the target meter hides Monthly Table', () => {
    const gasCard: MeterCardView = {
      meter: meter({
        guid: 'meter-gas',
        name: 'Gas Backup',
        source: 'Natural Gas',
        meterReadingDataApplication: 'fullMonth'
      }),
      readingCount: 2,
      sourceColor: '#d16a22',
      statusLabel: 'Valid',
      statusTone: 'success',
      statusIcon: 'success',
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
    Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-workbench-header__meter-item'))[1].click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-gas',
      'readings'
    ]);
  });

  it('switches to settings when the target meter hides Bill Inspection', () => {
    const gasCard: MeterCardView = {
      meter: meter({
        guid: 'meter-gas',
        name: 'Gas Backup',
        source: 'Natural Gas',
        charges: [charge()]
      }),
      readingCount: 2,
      sourceColor: '#d16a22',
      statusLabel: 'Valid',
      statusTone: 'success',
      statusIcon: 'success',
      firstReadingLabel: 'Jan 2026',
      latestReadingLabel: 'Feb 2026',
      scopeLabel: 'Stationary combustion',
      statusIssueLabels: [],
      statusActionSummaries: []
    };
    const fixture = setup({
      tab: 'bill-inspection',
      selectedMeter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', charges: [charge()] }),
      meterCards: [defaultMeterCard(meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', charges: [charge()] })), gasCard]
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.v1-meter-workbench-header__meter-toggle')?.click();
    fixture.detectChanges();
    Array.from(element.querySelectorAll<HTMLButtonElement>('.v1-meter-workbench-header__meter-item'))[1].click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-gas',
      'settings'
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

@Directive({
  selector: '[routerLink]',
  standalone: false
})
class RouterLinkStubDirective {
  @Input() routerLink?: unknown;
}

function setup(options: {
  tab?: MeterWorkbenchTabId;
  childRoute?: { snapshot?: { data?: { meterTab?: MeterWorkbenchTabId } } };
  selectedMeter?: ReturnType<typeof meter>;
  selectedMeterCard?: MeterCardView;
  meterCards?: MeterCardView[];
  hasMeterRoute?: boolean;
  canWrite?: boolean;
  hasPending?: boolean;
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
  selectedMeterUsageFacts?: MeterUsageFactsView;
  factsExpanded?: boolean;
  facilityValue?: ReturnType<typeof facility>;
  statusFindings?: StatusItem[];
} = {}): ComponentFixture<MeterWorkbenchComponent> {
  const selectedMeter = signal(options.selectedMeter === undefined && options.hasMeterRoute
    ? undefined
    : options.selectedMeter ?? meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy' })
  );
  const selectedMeterGroup = signal(group({ guid: 'group-energy', name: 'Purchased Electricity' }));
  const selectedMeterValue = selectedMeter();
  const selectedMeterCard = signal<MeterCardView | undefined>(options.selectedMeterCard ?? (selectedMeterValue ? defaultMeterCard(selectedMeterValue) : undefined));
  const meterCards = signal(options.meterCards ?? (selectedMeterCard() ? [selectedMeterCard() as MeterCardView] : []));
  const meters = signal(meterCards().map(card => card.meter));
  const selectedMeterReadingCount = signal(1);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const hasMeterRoute = signal(options.hasMeterRoute ?? true);
  const calendarizationState = signal(options.calendarizationState ?? 'ready');
  const selectedMeterUsageFacts = signal(options.selectedMeterUsageFacts ?? usageFactsView());
  const factsExpanded = signal(options.factsExpanded ?? true);
  const routerEvents = new Subject<NavigationEnd>();

  TestBed.configureTestingModule({
    declarations: [
      MeterWorkbenchComponent,
      MeterWorkbenchTabsComponent,
      RouterOutletStubDirective,
      RouterLinkStubDirective
    ],
    imports: [CommonModule, ReactiveFormsModule, IconComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(account({ guid: 'account-a', name: 'Account A' })),
          facility: signal(options.facilityValue ?? facility({
            guid: 'facility-a', accountId: 'account-a', name: 'Facility A', energyUnit: 'kWh',
            volumeLiquidUnit: 'kgal', volumeGasUnit: 'CCF', massUnit: 'lb', energyIsSource: false
          })),
          selectedMeter,
          selectedMeterCard,
          meterCards,
          meters,
          selectedMeterGroup,
          selectedMeterReadingCount,
          selectedMeterUsageFacts,
          calendarizationState,
          canWrite,
          hasPending,
          hasMeterRoute
        }
      },
      {
        provide: WorkbenchLayoutService,
        useValue: {
          factsExpanded: factsExpanded.asReadonly(),
          toggleFacts: () => factsExpanded.update(expanded => !expanded)
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
          ],
          accountDataRoute: (accountGuid: string, detail = 'portfolio') => [
            '/v1',
            'workspace',
            'account',
            accountGuid,
            'data',
            detail
          ]
        }
      },
      { provide: Router, useValue: { navigate: vi.fn(), events: routerEvents } },
      {
        provide: WorkspaceStatusService,
        useValue: {
          state: signal('ready'),
          meterFindings: () => options.statusFindings ?? []
        }
      },
      {
        provide: WorkspaceCommandBoundary,
        useValue: {
          execute: vi.fn(async (_options, persist: () => Promise<unknown>) => ({ value: await persist() }))
        }
      },
      {
        provide: MeterCommandHandler,
        useValue: { updateMeter: vi.fn(async (updatedMeter: unknown) => updatedMeter) }
      },
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

function defaultMeterCard(cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy' })): MeterCardView {
  return {
    meter: cardMeter,
    group: group({ guid: 'group-energy', name: 'Purchased Electricity' }),
    readingCount: 1,
    sourceColor: '#4f83cc',
    statusLabel: 'Valid',
    statusTone: 'success',
    statusIcon: 'success',
    firstReadingLabel: 'Jan 2026',
    latestReadingLabel: 'Jan 2026',
    scopeLabel: 'Purchased Electricity',
    statusIssueLabels: [],
    statusActionSummaries: []
  };
}

function charge() {
  return {
    guid: 'charge-a',
    name: 'Demand Charge',
    chargeType: 'demand' as const,
    displayUsageInTable: true,
    displayChargeInTable: true
  };
}
