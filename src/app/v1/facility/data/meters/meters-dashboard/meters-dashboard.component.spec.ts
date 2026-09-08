import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { buildMeterGroupSections } from '../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { group, meter, reading } from '../facility-meters.testing';
import { MetersDashboardComponent } from './meters-dashboard.component';

describe('MetersDashboardComponent', () => {
  it('renders facility meters by group with ungrouped meters', () => {
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
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('Electric Main');
    expect(text).toContain('2');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('City Water');
    expect(text).toContain('Coming soon');
  });

  it('opens a meter workbench from the meter card action', () => {
    const fixture = setup({
      meters: [
        meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' })
      ],
      groups: [
        group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
      ]
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Open meter"]').click();

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

  it('shows grouping WIP controls and pending or read-only messaging', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter grouping');
    expect(readOnlyFixture.nativeElement.textContent).toContain('Add group WIP');
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter actions are unavailable');
    const wipButtons = Array.from(readOnlyFixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(wipButtons.find(button => button.textContent?.includes('Add group WIP'))?.disabled).toBe(true);
    expect(wipButtons.find(button => button.textContent?.includes('Reassign meters WIP'))?.disabled).toBe(true);

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
} = {}): ComponentFixture<MetersDashboardComponent> {
  const meters = signal(options.meters ?? []);
  const meterData = signal(options.meterData ?? []);
  const groups = signal(options.groups ?? []);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const groupSections = signal(buildMeterGroupSections(meters(), meterData(), groups()));

  TestBed.configureTestingModule({
    declarations: [MetersDashboardComponent],
    imports: [CommonModule],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          meters,
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
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });

  return TestBed.createComponent(MetersDashboardComponent);
}
