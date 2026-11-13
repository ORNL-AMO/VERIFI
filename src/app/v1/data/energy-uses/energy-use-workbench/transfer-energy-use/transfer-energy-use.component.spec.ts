import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseGroup, energyUseItem, energyUsesSnapshot } from '../../energy-uses.testing';
import { TransferEnergyUseComponent } from './transfer-energy-use.component';

describe('Transfer energy use slideout', () => {
  function setup() {
    const item = energyUseItem(), target = energyUseGroup({ guid: 'destination', name: 'Destination' });
    const store = new AccountWorkspaceStore();
    store.publish({ ...energyUsesSnapshot([item]), energyUseGroups: [energyUseGroup(), target, energyUseGroup({ guid: 'foreign', facilityId: 'facility-b' })] });
    const actions = { transfer: vi.fn<EnergyUseActionsService['transfer']>(async (_identity, before, target) => ({ ...before, energyUseGroupId: target.guid })), recoverPublication: vi.fn(async () => {}) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions }] });
    const fixture = TestBed.createComponent(TransferEnergyUseComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('item', item); fixture.componentRef.setInput('canAct', true); fixture.detectChanges();
    return { fixture, component, store, actions, item, target };
  }
  it('offers only other saved groups in the current facility and requires an unchanged reviewed item and target', async () => {
    const { fixture, component, actions, item, target, store } = setup();
    component.open(); fixture.detectChanges();
    expect(component.facility()?.guid).toBe(item.facilityId);
    expect(component.groups().map(group => group.guid)).toEqual(['destination']);
    component.chooseGroup(target); expect(component.canConfirm()).toBe(true);
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => group.guid === target.guid ? { ...group, name: 'Changed' } : group) });
    expect(component.stale()).toBe(true); await component.confirm(); expect(actions.transfer).not.toHaveBeenCalled();
    component.close(); expect(component.blocked()).toBe(false);
    component.open(); fixture.detectChanges(); component.chooseGroup(component.groups()[0]);
    const moved = vi.fn(); component.transferred.subscribe(moved);
    await component.confirm();
    expect(actions.transfer).toHaveBeenCalledTimes(1); expect(moved).toHaveBeenCalledWith(expect.objectContaining({ guid: item.guid, energyUseGroupId: target.guid }));
    expect(component.blocked()).toBe(false);
  });
  it('keeps committed recovery protected and never repeats a durable transfer', async () => {
    const { fixture, component, actions, store, item, target } = setup();
    component.open(); fixture.detectChanges(); component.chooseGroup(target);
    actions.transfer.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true));
    await component.confirm(); expect(component.committed()).toBe(true);
    component.close(); await component.confirm(); expect(component.review()).toBeDefined();
    actions.recoverPublication.mockImplementationOnce(async () => store.publish({ ...store.snapshot()!, energyUseEquipment: [{ ...item, energyUseGroupId: target.guid }] }));
    await component.recover(); expect(component.blocked()).toBe(false);
    expect(actions.transfer).toHaveBeenCalledTimes(1); expect(actions.recoverPublication).toHaveBeenCalledWith(item.accountId);
  });
});
