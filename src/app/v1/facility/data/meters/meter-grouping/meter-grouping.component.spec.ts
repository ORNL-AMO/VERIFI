import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildMeterGroupSections } from '@app/v1/facility/data/meters/facility-meters.models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { account, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { MeterGroupingComponent } from './meter-grouping.component';

describe('MeterGroupingComponent', () => {
  it('renders group lanes with grouping actions', () => {
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
    const breadcrumb = fixture.nativeElement.querySelector('[aria-label="Meter grouping context"]') as HTMLElement;
    expect(text).toContain('Meter Grouping');
    expect(text).not.toContain('Facility Data');
    expect(text).toContain('Account A');
    expect(text).toContain('Facility A');
    expect(breadcrumb.classList.contains('v1-data-context-breadcrumb')).toBe(true);
    expect(breadcrumb.textContent).not.toContain('Meter Grouping');
    expect(fixture.componentInstance.accountMetersRoute()).toEqual([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio',
      'meters'
    ]);
    expect((breadcrumb.querySelector('a') as HTMLAnchorElement).textContent?.trim()).toBe('Account A');
    expect(fixture.debugElement.query(By.css('.v1-facility-meters__title app-ui-icon')).componentInstance.name).toBe('meterGroup');
    expect(text).not.toContain('Drag meters between groups');
    expect(text).toContain('Add group');
    expect(text).not.toContain('Add meter');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('Electric Main');
    expect(text).toContain('Ungrouped');
    expect(text).toContain('City Water');
    expect(fixture.nativeElement.querySelectorAll('.v1-meter-lane').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-meter-group-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('[aria-label="Edit Electric Main settings"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open meter"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-meter-browse-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-dashboard-action-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-facility-meters__header .v1-btn--action')?.textContent).toContain('Add group');
    expect(findButton(fixture, 'Add group')?.classList.contains('v1-btn--action')).toBe(true);
  });

  it('opens the selected meter workbench from the compact card edit action', () => {
    const fixture = setup({
      meters: [meter({ guid: 'meter-electric', name: 'Electric Main' })]
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Edit Electric Main settings"]') as HTMLButtonElement).click();

    expect(navigateSpy).toHaveBeenCalledWith([
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
} = {}): ComponentFixture<MeterGroupingComponent> {
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
    imports: [
      RouterModule.forRoot([]),
      MeterGroupingComponent
    ],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          account: signal(account()),
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
          accountDataRoute: (accountGuid: string, detail = 'portfolio') => [
            '/v1',
            'workspace',
            'account',
            accountGuid,
            'data',
            detail
          ],
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
      { provide: MetersDashboardActionsService, useValue: actions }
    ]
  });

  return TestBed.createComponent(MeterGroupingComponent);
}

function clickButton(fixture: ComponentFixture<MeterGroupingComponent>, label: string): void {
  findButton(fixture, label)?.click();
}

function findButton(fixture: ComponentFixture<MeterGroupingComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label));
}
