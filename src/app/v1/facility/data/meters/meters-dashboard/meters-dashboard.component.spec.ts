import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { buildMeterCards, buildMeterGroupSections } from '../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { group, meter, reading } from '../facility-meters.testing';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { MetersDashboardComponent } from './meters-dashboard.component';

describe('MetersDashboardComponent', () => {
  it('defaults to Meters mode and renders the browse view toggle as active', () => {
    const fixture = setup();

    fixture.detectChanges();

    expect(fixture.componentInstance.activeMode()).toBe('meters');
    expect(fixture.nativeElement.textContent).toContain('Meters');
    expect(fixture.nativeElement.textContent).toContain('Grouping');
    expect(fixture.nativeElement.querySelector('.v1-facility-meters__header .v1-meter-dashboard-mode-toggle')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-facility-meters__header .v1-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-meters-browse-view .v1-meter-dashboard-action-bar')).not.toBeNull();
    expect(findButton(fixture, 'Meters')?.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-meters-browse-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-meters-grouping-view')).toBeNull();
    expect(findButton(fixture, 'Add group')).toBeUndefined();
  });

  it('switches dashboard modes through the mode query parameter', () => {
    const fixture = setup();
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    clickButton(fixture, 'Grouping');
    fixture.detectChanges();

    expect(fixture.componentInstance.activeMode()).toBe('grouping');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { mode: 'grouping' },
      queryParamsHandling: 'merge'
    }));
    expect(fixture.nativeElement.querySelector('app-meters-grouping-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-action-bar .v1-btn--action')?.textContent).toContain('Add group');
    expect(findButton(fixture, 'Add meter')).toBeUndefined();
  });

  it('uses the content-control style for the view toggle', () => {
    const fixture = setup();

    fixture.detectChanges();

    expect(findButton(fixture, 'Meters')?.classList.contains('v1-meter-dashboard-mode-toggle__item--active')).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-mode-toggle .v1-btn--action')).toBeNull();
  });

  it('falls back to Meters mode for invalid mode query parameters', () => {
    const fixture = setup({ mode: 'invalid-mode' });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    expect(fixture.componentInstance.activeMode()).toBe('meters');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { mode: 'meters' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }));
  });

  it('renders shared read-only and pending messaging', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter actions are unavailable');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('Another workspace update is still finishing');
  });
});

function setup(options: {
  meters?: ReturnType<typeof meter>[];
  meterData?: ReturnType<typeof reading>[];
  groups?: ReturnType<typeof group>[];
  canWrite?: boolean;
  hasPending?: boolean;
  mode?: string;
} = {}): ComponentFixture<MetersDashboardComponent> {
  const meters = signal(options.meters ?? [
    meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' })
  ]);
  const meterData = signal(options.meterData ?? [
    reading({ guid: 'reading-a', meterId: 'meter-electric' })
  ]);
  const groups = signal(options.groups ?? [
    group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
  ]);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const meterCards = signal(buildMeterCards(meters(), meterData(), groups()));
  const groupSections = signal(buildMeterGroupSections(meters(), meterData(), groups()));
  const queryParamMap = new BehaviorSubject(convertToParamMap(options.mode ? { mode: options.mode } : {}));
  const route = { queryParamMap: queryParamMap.asObservable() };
  const actions = {
    canAssignMeterToTarget: vi.fn(() => true),
    createMeter: vi.fn().mockResolvedValue(meter({ guid: 'meter-created' })),
    createGroup: vi.fn().mockResolvedValue(group({ guid: 'group-created' })),
    updateGroup: vi.fn().mockResolvedValue(undefined),
    deleteGroup: vi.fn().mockResolvedValue(undefined),
    reassignMeter: vi.fn().mockResolvedValue(undefined)
  };

  TestBed.configureTestingModule({
    imports: [MetersDashboardComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          meterGroups: groups,
          meters,
          meterCards,
          groupSections,
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
      { provide: ActivatedRoute, useValue: route },
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
