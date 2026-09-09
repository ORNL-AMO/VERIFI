import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { buildMeterCards } from '../../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { group, meter, reading } from '../../facility-meters.testing';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';
import { MetersBrowseViewComponent } from './meters-browse-view.component';

describe('MetersBrowseViewComponent', () => {
  it('renders meter cards with group footer tags and no grouping controls', () => {
    const fixture = setup({
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' }),
        meter({ guid: 'meter-water', name: 'City Water', groupId: undefined, source: 'Water Intake' })
      ],
      meterData: [
        reading({ guid: 'reading-a', meterId: 'meter-electric' }),
        reading({ guid: 'reading-b', meterId: 'meter-electric' })
      ],
      groups: [
        group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
      ]
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('City Water');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('2');
    expect(text).toContain('Coming soon');
    expect(text).toContain('Add meter');
    expect(fixture.nativeElement.querySelectorAll('app-meter-browse-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-action-bar')).not.toBeNull();
    expect(findButton(fixture, 'Add meter')?.classList.contains('v1-btn--action')).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-meter-lane')).toBeNull();
    expect(text).not.toContain('Move meter');
    expect(text).not.toContain('Add group');
  });

  it('opens the selected meter workbench', () => {
    const fixture = setup({
      meters: [meter({ guid: 'meter-electric', name: 'Electric Main' })]
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open meter"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-electric',
      'settings'
    ]);
  });

  it('renders the no-meter empty state', () => {
    const fixture = setup({ meters: [], meterData: [], groups: [] });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No meters yet');
    expect(fixture.nativeElement.textContent).toContain('Meter cards will appear here');
  });

  it('opens the Add Meter slideout from the browse action bar', () => {
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

    const actions = TestBed.inject(MetersDashboardActionsService) as any;
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

  it('disables the Add Meter action while read-only or pending', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(findButton(readOnlyFixture, 'Add meter')?.disabled).toBe(true);

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
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
} = {}): ComponentFixture<MetersBrowseViewComponent> {
  const meters = signal(options.meters ?? []);
  const meterData = signal(options.meterData ?? []);
  const groups = signal(options.groups ?? []);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const meterCards = signal(buildMeterCards(meters(), meterData(), groups()));
  const actions = {
    createMeter: vi.fn().mockResolvedValue(options.createdMeter ?? meter({ guid: 'meter-created' }))
  };

  TestBed.configureTestingModule({
    imports: [MetersBrowseViewComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          meterGroups: groups,
          meterCards,
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
      { provide: MetersDashboardActionsService, useValue: actions },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  return TestBed.createComponent(MetersBrowseViewComponent);
}

function clickButton(fixture: ComponentFixture<MetersBrowseViewComponent>, label: string): void {
  findButton(fixture, label)?.click();
}

function findButton(fixture: ComponentFixture<MetersBrowseViewComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label));
}
