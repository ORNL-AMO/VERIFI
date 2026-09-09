import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { account, facility, group, meter } from '../facility-meters.testing';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';

describe('MetersDashboardActionsService', () => {
  it('creates a meter from factory defaults plus draft values', async () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity', groupType: 'Energy' });
    const { service, commandBoundary, meterHandler } = setup({ groups: [energyGroup] });

    const created = await service.createMeter({
      name: ' Main Electric ',
      source: 'Electricity',
      groupId: energyGroup.guid
    });

    expect(created).toMatchObject({
      name: 'Main Electric',
      source: 'Electricity',
      groupId: 'group-energy',
      facilityId: 'facility-a',
      accountId: 'account-a'
    });
    expect(meterHandler.addMeter).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Main Electric',
      source: 'Electricity'
    }), 'account-a');
    expect(commandBoundary.execute).toHaveBeenCalledWith(expect.objectContaining({
      entityKind: 'meter',
      changeKind: 'add',
      label: 'Adding meter'
    }), expect.any(Function));
  });

  it('creates, updates, and deletes groups through the meter group handlers', async () => {
    const existingGroup = group({ guid: 'group-energy', name: 'Electricity', groupType: 'Energy', id: 4 });
    const groupedMeter = meter({ guid: 'meter-electric', name: 'Main', groupId: existingGroup.guid });
    const { service, meterHandler, meterGroupHandler } = setup({
      meters: [groupedMeter],
      groups: [existingGroup]
    });

    await service.createGroup({ name: ' Water ', groupType: 'Water', description: ' Incoming ' });
    await service.updateGroup(existingGroup, { name: 'Purchased Electricity', groupType: 'Energy' });
    await service.deleteGroup(existingGroup);

    expect(meterHandler.addMeterGroup).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Water',
      groupType: 'Water',
      description: 'Incoming'
    }), 'account-a');
    expect(meterGroupHandler.addGroup).toHaveBeenCalled();
    expect(meterGroupHandler.saveMeterGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Purchased Electricity' }),
      false,
      'Energy',
      [],
      [],
      'account-a'
    );
    expect(meterHandler.deleteMeterGroup).toHaveBeenCalledWith(4);
    expect(meterHandler.updateMeter).toHaveBeenCalledWith(expect.objectContaining({
      guid: groupedMeter.guid,
      groupId: undefined
    }), 'account-a');
    expect(meterGroupHandler.deleteGroup).toHaveBeenCalledWith(expect.objectContaining({ guid: existingGroup.guid }));
    expect(groupedMeter.groupId).toBe(existingGroup.guid);
  });

  it('uses the same reassignment command for drag and move actions without mutating workspace records', async () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity', groupType: 'Energy' });
    const ungroupedMeter = meter({ guid: 'meter-electric', name: 'Main', groupId: undefined, source: 'Electricity' });
    const { service, meterHandler } = setup({
      meters: [ungroupedMeter],
      groups: [energyGroup]
    });

    await service.reassignMeter(ungroupedMeter, { id: energyGroup.guid, label: energyGroup.name, group: energyGroup });

    expect(meterHandler.updateMeter).toHaveBeenCalledWith(expect.objectContaining({
      guid: ungroupedMeter.guid,
      groupId: energyGroup.guid
    }), 'account-a');
    expect(ungroupedMeter.groupId).toBeUndefined();
  });

  it('blocks invalid source to group assignments before persistence', async () => {
    const waterGroup = group({ guid: 'group-water', name: 'Water', groupType: 'Water' });
    const electricMeter = meter({ guid: 'meter-electric', name: 'Main', groupId: undefined, source: 'Electricity' });
    const { service, commandBoundary, meterHandler } = setup({
      meters: [electricMeter],
      groups: [waterGroup]
    });

    await expect(service.reassignMeter(electricMeter, { id: waterGroup.guid, label: waterGroup.name, group: waterGroup }))
      .rejects.toMatchObject({ code: 'validation-failed' } satisfies Partial<WorkspaceWriteError>);
    await expect(service.createMeter({ name: 'Electric', source: 'Electricity', groupId: waterGroup.guid }))
      .rejects.toMatchObject({ code: 'validation-failed' } satisfies Partial<WorkspaceWriteError>);

    expect(commandBoundary.execute).not.toHaveBeenCalled();
    expect(meterHandler.updateMeter).not.toHaveBeenCalled();
  });
});

function setup(options: {
  meters?: ReturnType<typeof meter>[];
  groups?: ReturnType<typeof group>[];
} = {}) {
  const meterHandler = {
    addMeter: vi.fn().mockImplementation(async item => ({ ...item, id: 10 })),
    updateMeter: vi.fn().mockImplementation(async item => item),
    addMeterGroup: vi.fn().mockImplementation(async item => ({ ...item, id: 20 })),
    updateMeterGroup: vi.fn().mockImplementation(async item => item),
    deleteMeterGroup: vi.fn().mockResolvedValue(1)
  };
  const meterGroupHandler = {
    addGroup: vi.fn().mockResolvedValue(undefined),
    saveMeterGroup: vi.fn().mockResolvedValue(undefined),
    deleteGroup: vi.fn().mockResolvedValue(undefined)
  };
  const commandBoundary = {
    execute: vi.fn().mockImplementation(async (_options, persist) => ({
      value: await persist(),
      change: { entityKind: 'meter', changeKind: 'update', accountGuid: 'account-a' }
    }))
  };
  const store = {
    account: signal(account()),
    selectedFacility: signal(facility()),
    canWrite: signal(true),
    hasPending: signal(false),
    facilityMeters: signal(options.meters ?? []),
    facilityMeterGroups: signal(options.groups ?? [])
  };

  TestBed.configureTestingModule({
    providers: [
      MetersDashboardActionsService,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: commandBoundary },
      { provide: MeterCommandHandler, useValue: meterHandler },
      { provide: MeterGroupCommandHandler, useValue: meterGroupHandler }
    ]
  });

  return {
    service: TestBed.inject(MetersDashboardActionsService),
    commandBoundary,
    meterHandler,
    meterGroupHandler
  };
}
