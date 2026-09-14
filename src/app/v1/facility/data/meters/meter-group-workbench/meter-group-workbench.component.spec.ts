import { CommonModule } from '@angular/common';
import { Directive, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { MeterGroupResultsView, MeterUsageFactsView } from '../facility-meters.models';
import { facility, group, meter } from '../facility-meters.testing';
import { MeterGroupWorkbenchComponent } from './meter-group-workbench.component';

describe('MeterGroupWorkbenchComponent', () => {
  it('renders calendarized usage facts in the selected group header', () => {
    const fixture = setup();

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Facility A Meter Group');
    expect(text).toContain('Energy Group');
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
});

@Directive({
  selector: 'router-outlet',
  standalone: false
})
class RouterOutletStubDirective { }

function setup(options: {
  results?: MeterGroupResultsView;
  calendarizationState?: 'idle' | 'loading' | 'ready' | 'error';
} = {}): ComponentFixture<MeterGroupWorkbenchComponent> {
  const selectedGroup = group({ guid: 'group-energy', name: 'Energy Group', groupType: 'Energy' });
  const routerEvents = new Subject<NavigationEnd>();

  TestBed.configureTestingModule({
    declarations: [
      MeterGroupWorkbenchComponent,
      RouterOutletStubDirective
    ],
    imports: [CommonModule],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal({ guid: 'account-a' }),
          facility: signal(facility({ guid: 'facility-a', name: 'Facility A', energyIsSource: false })),
          selectedMeterGroupForWorkbench: signal(selectedGroup),
          meterGroups: signal([selectedGroup]),
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
      { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn() } },
      { provide: FacilityCommandHandler, useValue: { update: vi.fn() } },
      { provide: Router, useValue: { navigate: vi.fn(), events: routerEvents } },
      { provide: ActivatedRoute, useValue: { firstChild: { snapshot: { data: { meterGroupTab: 'monthly-table' } } } } }
    ]
  });

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
