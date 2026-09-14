import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildMeterCards } from '@app/v1/facility/data/meters/facility-meters.models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { MetersDashboardComponent } from './meters-dashboard.component';

describe('MetersDashboardComponent', () => {
  it('renders meter cards with group footer tags and no grouping controls', () => {
    const fixture = setup({
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' }),
        meter({ guid: 'meter-water', name: 'City Water', groupId: undefined, source: 'Water Intake' })
      ],
      meterData: [
        reading({ guid: 'reading-a', meterId: 'meter-electric', month: 12, year: 2025 }),
        reading({ guid: 'reading-b', meterId: 'meter-electric', month: 1, year: 2026 })
      ],
      groups: [
        group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Meters');
    expect(fixture.debugElement.query(By.css('.v1-facility-meters__title app-ui-icon')).componentInstance.name).toBe('meter');
    expect(text).toContain('Electric Main');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('City Water');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('First reading');
    expect(text).toContain('Dec 2025');
    expect(text).toContain('Latest');
    expect(text).toContain('Scope');
    expect(text).toContain('Add meter');
    expect(fixture.nativeElement.querySelectorAll('app-meter-browse-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card__source-chip')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-action-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-facility-meters__header .v1-btn--action')?.textContent).toContain('Add meter');
    expect(findButton(fixture, 'Add meter')?.classList.contains('v1-btn--action')).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-mode-toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-meter-grouping')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-lane')).toBeNull();
    expect(text).not.toContain('Move meter');
    expect(text).not.toContain('Add group');
  });

  it('ignores legacy dashboard mode query parameters and keeps rendering meters', () => {
    const fixture = setup();
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-meter-browse-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-meter-grouping')).toBeNull();
  });

  it('renders the no-meter empty state', () => {
    const fixture = setup({ meters: [], meterData: [], groups: [] });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No meters yet');
    expect(fixture.nativeElement.textContent).toContain('Meter cards will appear here');
  });

  it('opens the Add Meter slideout from the dashboard action bar', () => {
    const fixture = setup();

    fixture.detectChanges();
    clickButton(fixture, 'Add meter');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create the meter, then continue setup');
  });

  it('persists a meter draft and opens the created meter workbench', async () => {
    const created = meter({ guid: 'meter-new', name: 'Boiler Gas', source: 'Natural Gas' });
    const fixture = setup({ createdMeter: created });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    await fixture.componentInstance.saveMeterDraft({ name: 'Boiler Gas', source: 'Natural Gas' });

    const actions = fixture.componentRef.injector.get(MetersDashboardActionsService) as any;
    expect(actions.createMeter).toHaveBeenCalledWith({ name: 'Boiler Gas', source: 'Natural Gas' });
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-new',
      'settings'
    ]);
  });

  it('renders shared read-only and pending messaging and disables Add Meter', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter actions are unavailable');
    expect(findButton(readOnlyFixture, 'Add meter')?.disabled).toBe(true);

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('Another workspace update is still finishing');
    expect(findButton(pendingFixture, 'Add meter')?.disabled).toBe(true);
  });
});

function setup(options: {
  meters?: ReturnType<typeof meter>[];
  meterData?: ReturnType<typeof reading>[];
  groups?: ReturnType<typeof group>[];
  canWrite?: boolean;
  hasPending?: boolean;
  createdMeter?: ReturnType<typeof meter>;
} = {}): ComponentFixture<MetersDashboardComponent> {
  const meters = signal(options.meters ?? [
    meter({ guid: 'meter-electric', name: 'Electric Main', source: 'Electricity' })
  ]);
  const meterData = signal(options.meterData ?? []);
  const groups = signal(options.groups ?? []);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const calendarizationState = signal<'idle' | 'loading' | 'ready' | 'error'>('ready');
  const meterCards = signal(buildMeterCards(meters(), meterData(), groups()));
  const actions = {
    createMeter: vi.fn().mockResolvedValue(options.createdMeter ?? meter({ guid: 'meter-created' })),
    copyMeter: vi.fn().mockResolvedValue(meter({ guid: 'meter-copy' })),
    deleteMeter: vi.fn().mockResolvedValue(undefined)
  };

  TestBed.configureTestingModule({
    imports: [MetersDashboardComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          meterGroups: groups,
          meterCards,
          calendarizationState,
          canWrite,
          hasPending
        }
      },
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
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  TestBed.overrideComponent(MetersDashboardComponent, {
    set: {
      providers: [{ provide: MetersDashboardActionsService, useValue: actions }]
    }
  });

  return TestBed.createComponent(MetersDashboardComponent);
}

function clickButton(fixture: ComponentFixture<MetersDashboardComponent>, label: string): void {
  findButton(fixture, label)?.click();
}

function findButton(fixture: ComponentFixture<MetersDashboardComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label));
}
