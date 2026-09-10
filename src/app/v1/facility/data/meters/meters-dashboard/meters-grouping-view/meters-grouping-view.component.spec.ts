import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { buildMeterGroupSections } from '../../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { group, meter, reading } from '../../facility-meters.testing';
import { MetersDashboardActionsService } from '../meters-dashboard-actions.service';
import { MetersGroupingViewComponent } from './meters-grouping-view.component';

describe('MetersGroupingViewComponent', () => {
  it('renders group lanes without a local grouping header', () => {
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
    expect(text).not.toContain('Drag meters between groups');
    expect(text).toContain('Add group');
    expect(text).not.toContain('Add meter');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('Electric Main');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('City Water');
    expect(fixture.nativeElement.querySelectorAll('.v1-meter-lane').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-meter-group-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[aria-label="Open Electric Main settings"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open meter"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-meter-browse-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-action-bar')).not.toBeNull();
    expect(findButton(fixture, 'Add group')?.classList.contains('v1-btn--action')).toBe(true);
  });

  it('opens the selected meter workbench from the compact card name', () => {
    const fixture = setup({
      meters: [meter({ guid: 'meter-electric', name: 'Electric Main' })]
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open Electric Main settings"]') as HTMLButtonElement).click();

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

  it('opens the move slideout from a compact group card', () => {
    const fixture = setup({
      meters: [meter({ guid: 'meter-electric', name: 'Electric Main' })]
    });

    fixture.detectChanges();
    clickButton(fixture, 'Move meter');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choose a group for Electric Main.');
    expect(fixture.nativeElement.querySelector('app-move-meter-slideout')).not.toBeNull();
  });

  it('supports group save, move, and delete workflows through the action service', async () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy', id: 7 });
    const electricMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: undefined, source: 'Electricity' });
    const fixture = setup({
      meters: [electricMeter],
      groups: [energyGroup]
    });
    const card = buildMeterGroupSections([electricMeter], [], [energyGroup])
      .find(section => section.id === 'ungrouped')?.meters[0];
    if (!card) {
      throw new Error('Ungrouped meter card was not created.');
    }
    const target = { id: energyGroup.guid, label: energyGroup.name, group: energyGroup };

    await fixture.componentInstance.saveGroupDraft({ name: 'Steam', groupType: 'Energy' });
    fixture.componentInstance.openEditGroup({ group: energyGroup });
    await fixture.componentInstance.saveGroupDraft({ name: 'Electricity', groupType: 'Energy' });
    await fixture.componentInstance.moveMeter(card, target);
    fixture.componentInstance.requestDeleteGroup(energyGroup);
    await fixture.componentInstance.confirmDeleteGroup();

    const actions = TestBed.inject(MetersDashboardActionsService) as any;
    expect(actions.createGroup).toHaveBeenCalledWith({ name: 'Steam', groupType: 'Energy' });
    expect(actions.updateGroup).toHaveBeenCalledWith(energyGroup, { name: 'Electricity', groupType: 'Energy' });
    expect(actions.reassignMeter).toHaveBeenCalledWith(electricMeter, target);
    expect(actions.deleteGroup).toHaveBeenCalledWith(energyGroup);
  });

  it('renders grouping slideouts and confirmation modal from grouping actions', () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy', id: 7 });
    const fixture = setup({
      meters: [
        meter({ guid: 'meter-electric-a', name: 'Electric Main', groupId: energyGroup.guid }),
        meter({ guid: 'meter-electric-b', name: 'Electric Backup', groupId: energyGroup.guid })
      ],
      groups: [energyGroup]
    });

    fixture.detectChanges();
    clickButton(fixture, 'Add group');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create a group for organizing meter cards');

    clickButton(fixture, 'Close panel');
    fixture.componentInstance.openEditGroup({ group: energyGroup });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Save group');

    fixture.componentInstance.requestDeleteGroup(energyGroup);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Delete group');
    expect(fixture.nativeElement.textContent).toContain('2 meters will move to Ungrouped.');
  });

  it('disables grouping actions while read-only or pending', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(findButton(readOnlyFixture, 'Add group')?.disabled).toBe(true);
    expect(findButton(readOnlyFixture, 'Move meter')?.disabled).toBe(true);

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(findButton(pendingFixture, 'Add group')?.disabled).toBe(true);
  });
});

function setup(options: {
  meters?: ReturnType<typeof meter>[];
  meterData?: ReturnType<typeof reading>[];
  groups?: ReturnType<typeof group>[];
  canWrite?: boolean;
  hasPending?: boolean;
} = {}): ComponentFixture<MetersGroupingViewComponent> {
  const meters = signal(options.meters ?? [
    meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy', source: 'Electricity' })
  ]);
  const meterData = signal(options.meterData ?? []);
  const groups = signal(options.groups ?? [
    group({ guid: 'group-energy', name: 'Purchased Electricity', groupType: 'Energy' })
  ]);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const groupSections = signal(buildMeterGroupSections(meters(), meterData(), groups()));
  const actions = {
    canAssignMeterToTarget: vi.fn(() => true),
    createGroup: vi.fn().mockResolvedValue(group({ guid: 'group-created' })),
    updateGroup: vi.fn().mockResolvedValue(undefined),
    deleteGroup: vi.fn().mockResolvedValue(undefined),
    reassignMeter: vi.fn().mockResolvedValue(undefined)
  };

  TestBed.configureTestingModule({
    imports: [MetersGroupingViewComponent],
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
      { provide: MetersDashboardActionsService, useValue: actions },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });

  return TestBed.createComponent(MetersGroupingViewComponent);
}

function clickButton(fixture: ComponentFixture<MetersGroupingViewComponent>, label: string): void {
  findButton(fixture, label)?.click();
}

function findButton(fixture: ComponentFixture<MetersGroupingViewComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label));
}
