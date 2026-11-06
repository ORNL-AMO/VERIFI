import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { setupYearController } from './add-year-drawer.testing';

function finish(c: ReturnType<typeof setupYearController>['controller']): void { c.start(); for (let n = 0; n < c.drafts().length && !c.allOthersReviewed(); n++) { const previous = c.index(); c.next(); if (c.index() === previous) throw new Error(c.current()?.error || 'Cannot advance'); } }
describe('Group Add year draft controller', () => {
  it('offers distinct valid data years from the entire current account', () => {
    const { controller: c, store } = setupYearController(1);
    const item = store.energyUseEquipment()[0];
    store.publish({ ...store.snapshot()!, energyUseEquipment: [...store.energyUseEquipment(),
      { ...item, guid: 'unselected', facilityId: 'facility-b', energyUseGroupId: 'other', operatingConditionsData: [{ ...item.operatingConditionsData[0], year: 2022 }] },
      { ...item, guid: 'foreign', accountId: 'foreign', operatingConditionsData: [{ ...item.operatingConditionsData[0], year: 2030 }] }],
      meterData: [2021, 2024, 2021, 10000].map(year => ({ accountId: 'account-a', year } as IdbUtilityMeterData)).concat({ accountId: 'foreign', year: 2035 } as IdbUtilityMeterData),
      predictorData: [{ accountId: 'account-a', year: 2020 } as IdbPredictorData] });
    expect(c.yearChoices()).toEqual([2020, 2021, 2022, 2024]);
    c.chooseYear(2021); expect(c.selectedYear()).toBe(2021); expect(c.index()).toBe(0);
  });
  it('offers the current year when the account has no dated data', () => {
    const { controller: c, store } = setupYearController(1);
    store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map(item => ({ ...item, operatingConditionsData: [], utilityData: item.utilityData.map(source => ({ ...source, energyUse: [] })) })) });
    expect(c.yearChoices()).toEqual([new Date().getFullYear()]);
    c.chooseYear(new Date().getFullYear()); expect(c.index()).toBe(0);
  });
  it('reveals Other without advancing and protects drafts when a different card is chosen', () => {
    const { controller: c } = setupYearController(1); c.chooseOtherYear();
    expect(c.otherYear()).toBe(true); expect(c.index()).toBe(-1);
    c.year.setValue(2025); c.start(); const form = c.current()!.form;
    c.go(-1); c.chooseYear(2024); expect(c.confirmation()).toBe('year'); expect(c.current()).toBeUndefined();
    c.cancelYearChange(); expect(c.year.value).toBe(2025); expect(c.otherYear()).toBe(true);
    expect(c.drafts()[0].form).toBe(form);
  });
  it('keeps drafts through navigation and invalidates completed steps when edited', () => {
    const { controller: c, actions } = setupYearController(); c.start();
    const first = c.current()!.form!, conditions = first.controls.conditions.at(1);
    conditions.controls.hoursOfOperation.setValue(3210); c.next();
    expect(c.completed()).toHaveLength(1); expect(c.index()).toBe(1);
    c.go(0); expect(c.current()?.form).toBe(first); expect(conditions.controls.hoursOfOperation.value).toBe(3210);
    conditions.controls.dutyFactor.setValue(70); expect(c.completed()).toHaveLength(0);
    c.go(2); expect(c.canSave()).toBe(false); expect(actions.applyBatch).not.toHaveBeenCalled();
  });
  it('wraps to skipped equipment and allows Save all from the final unfinished item', async () => {
    const { controller: c, actions } = setupYearController(9); c.start();
    const first = c.current()!.form!;
    first.controls.conditions.at(1).controls.hoursOfOperation.setValue(3210);
    c.go(2);
    for (let index = 2; index < 9; index++) {
      expect(c.index()).toBe(index); expect(c.canSave()).toBe(false); c.next();
    }
    expect(c.index()).toBe(0); expect(c.completed()).toHaveLength(7);
    expect(c.current()?.form).toBe(first); expect(first.controls.conditions.at(1).controls.hoursOfOperation.value).toBe(3210);
    c.next(); expect(c.index()).toBe(1); expect(c.allOthersReviewed()).toBe(true); expect(c.canSave()).toBe(true);
    expect(await c.save()).toBe(true); expect(actions.applyBatch).toHaveBeenCalledTimes(1);
    expect(actions.applyBatch.mock.calls[0][1]).toHaveLength(9);
  });
  it('skips reviewed equipment and requires invalid skipped drafts to be corrected', () => {
    const { controller: c } = setupYearController(4); c.start(); c.next();
    c.current()!.form!.controls.conditions.at(1).controls.loadFactor.setValue(-1);
    c.go(2); c.next(); expect(c.index()).toBe(3); c.next();
    expect(c.index()).toBe(1); expect(c.allOthersReviewed()).toBe(true); expect(c.canSave()).toBe(false);
    c.next(); expect(c.index()).toBe(1); expect(c.current()?.error).toContain('assumptions');
    c.current()!.form!.controls.conditions.at(1).controls.loadFactor.setValue(50);
    expect(c.canSave()).toBe(true);
    c.go(0); expect(c.canSave()).toBe(false); c.next(); expect(c.index()).toBe(1);
  });
  it('validates each item and saves the complete selection once', async () => {
    const { controller: c, actions } = setupYearController(); finish(c);
    expect(c.canSave()).toBe(true); expect(await c.save()).toBe(true);
    expect(actions.applyBatch).toHaveBeenCalledTimes(1);
    expect(actions.applyBatch.mock.calls[0][1]).toHaveLength(3);
    expect(c.dirty()).toBe(false); expect(c.opened()).toBe(false);
  });
  it('blocks incomplete and invalid forms while retaining every draft', () => {
    const { controller: c } = setupYearController(); c.start();
    c.current()!.form!.controls.conditions.at(1).controls.loadFactor.setValue(-1); c.next();
    expect(c.index()).toBe(0); expect(c.current()?.error).toContain('assumptions');
    c.current()!.form!.controls.conditions.at(1).controls.loadFactor.setValue(50); c.next();
    expect(c.index()).toBe(1); expect(c.completed()).toHaveLength(1);
  });
  it('requires explicit discard or reset before abandoning the drafts', () => {
    const { controller: c } = setupYearController(); c.start(); c.next();
    const first = c.drafts()[0].form;
    expect(c.requestClose()).toBe(false); expect(c.confirmation()).toBe('discard');
    c.confirmation.set(null); c.go(-1); c.year.setValue(2026); c.start();
    expect(c.confirmation()).toBe('year'); expect(c.drafts()[0].form).toBe(first);
    c.confirmReset(); expect(c.selectedYear()).toBe(2026); expect(c.completed()).toHaveLength(0);
    expect(c.drafts()[0].form).not.toBe(first); c.discard(); expect(c.opened()).toBe(false);
  });
  it('loads existing destination values and allows annual updates', async () => {
    const { controller: c, actions } = setupYearController(1); c.year.setValue(2024); c.start();
    expect(c.current()?.existing).toBe(true); c.current()!.form!.controls.conditions.at(0).controls.hoursOfOperation.setValue(500);
    expect(await c.save()).toBe(true);
    expect(actions.applyBatch.mock.calls[0][1][0].after.operatingConditionsData).toHaveLength(1);
    expect(actions.applyBatch.mock.calls[0][1][0].after.operatingConditionsData[0].hoursOfOperation).toBe(500);
  });
  it('blocks stale saves and reloads only changed equipment after confirmation', async () => {
    const { controller: c, store, reload } = setupYearController(); finish(c);
    const retained = c.drafts()[1].form;
    store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().map((item, index) => index === 0 ? { ...item, notes: 'Changed elsewhere' } : item) });
    expect(c.stale()).toBe(true); expect(await c.save()).toBe(false);
    await c.reloadChanged(); expect(reload).toHaveBeenCalledWith(false);
    expect(c.drafts()[1].form).toBe(retained); expect(c.drafts()[1].completed).toBe(true);
    expect(c.drafts()[0].completed).toBe(false); expect(c.stale()).toBe(false);
    c.go(0); c.next(); c.go(2); expect(c.canSave()).toBe(true);
  });
  it.each(['deleted', 'moved', 'foreign'] as const)('blocks saving equipment that was %s', state => {
    const { controller: c, store } = setupYearController(); finish(c);
    store.publish({ ...store.snapshot()!, energyUseEquipment: state === 'deleted' ? store.energyUseEquipment().slice(1) : store.energyUseEquipment().map((item, index) => index ? item : { ...item,
      ...(state === 'moved' ? { energyUseGroupId: 'other' } : { accountId: 'other' }) }) });
    expect(c.missing()).toBe(true); expect(c.canSave()).toBe(false); expect(c.drafts()).toHaveLength(3);
  });
  it('retains forms after write failure and uses refresh-only recovery after a committed failure', async () => {
    const { controller: c, actions } = setupYearController(); finish(c); const draft = c.current()!.form;
    actions.applyBatch.mockRejectedValueOnce(new Error('Write failed'));
    expect(await c.save()).toBe(false); expect(c.current()?.form).toBe(draft); expect(c.dirty()).toBe(true);
    actions.applyBatch.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true));
    expect(await c.save()).toBe(false); expect(c.committed()).toBe(true); expect(c.requestClose()).toBe(false);
    expect(await c.save()).toBe(false); expect(await c.recover()).toBe(true);
    expect(actions.applyBatch).toHaveBeenCalledTimes(2); expect(actions.recoverPublication).toHaveBeenCalledTimes(1);
  });
  it('rejects overflowing years and respects unresolved group edits', () => {
    const { controller: c, canOpen } = setupYearController(); c.year.setValue(10000); c.start(); expect(c.drafts()).toHaveLength(0);
    canOpen.set(false); c.year.setValue(2025); c.start(); expect(c.drafts()).toHaveLength(0);
  });
});
