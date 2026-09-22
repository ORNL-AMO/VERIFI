import { of } from 'rxjs';
import { vi } from 'vitest';
import { CustomDataCommandHandler } from './custom-data-command-handler.service';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

const ACCOUNT = 'acct-1';

describe('CustomDataCommandHandler', () => {
  function createHandler() {
    const customEmissionsDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const customFuelDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const customGWPDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const transaction = { put: vi.fn(async () => undefined) };
    const transactions = { runTransaction: vi.fn(async (_stores, _mode, work) => work(transaction)) };
    const handler = new CustomDataCommandHandler(customEmissionsDb as any, customFuelDb as any, customGWPDb as any, transactions as any);
    return { handler, customEmissionsDb, customFuelDb, customGWPDb, transaction, transactions };
  }

  it('addCustomEmissions persists and returns the new item', async () => {
    const { handler, customEmissionsDb } = createHandler();
    customEmissionsDb.addWithObservable.mockReturnValue(of({ guid: 'ce-1', id: 1 }));
    const result = await handler.addCustomEmissions({ guid: 'ce-1', accountId: ACCOUNT } as IdbCustomEmissionsItem, ACCOUNT);
    expect(result.id).toBe(1);
  });

  it('updateCustomEmissions rejects cross-account item', async () => {
    const { handler, customEmissionsDb } = createHandler();
    await expect(
      handler.updateCustomEmissions({ guid: 'ce-1', accountId: 'other' } as IdbCustomEmissionsItem, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(customEmissionsDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deleteCustomEmissions returns id and rejects cross-account', async () => {
    const { handler, customEmissionsDb } = createHandler();
    customEmissionsDb.deleteWithObservable.mockReturnValue(of(undefined));
    const result = await handler.deleteCustomEmissions({ id: 3, guid: 'ce-1', accountId: ACCOUNT } as IdbCustomEmissionsItem, ACCOUNT);
    expect(result).toBe(3);
  });

  it('addCustomFuel persists and returns the new fuel', async () => {
    const { handler, customFuelDb } = createHandler();
    customFuelDb.addWithObservable.mockReturnValue(of({ guid: 'cf-1', id: 4 }));
    const result = await handler.addCustomFuel({ guid: 'cf-1', accountId: ACCOUNT } as IdbCustomFuel, ACCOUNT);
    expect(result.id).toBe(4);
  });

  it('updates a custom fuel and linked meters atomically', async () => {
    const { handler, transaction, transactions } = createHandler();
    const fuel = { id: 4, guid: 'cf-1', accountId: ACCOUNT, value: 'Renamed' } as IdbCustomFuel;
    const meters = [
      { id: 9, guid: 'meter-1', accountId: ACCOUNT, fuel: 'Renamed' } as IdbUtilityMeter,
      { id: 10, guid: 'meter-2', accountId: ACCOUNT, vehicleFuel: 'Renamed' } as IdbUtilityMeter
    ];

    const result = await handler.updateCustomFuelWithMeters(fuel, meters, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['customFuels', 'utilityMeter'],
      'readwrite',
      expect.any(Function)
    );
    expect(transaction.put).toHaveBeenNthCalledWith(1, 'customFuels', fuel);
    expect(transaction.put).toHaveBeenNthCalledWith(2, 'utilityMeter', meters[0]);
    expect(transaction.put).toHaveBeenNthCalledWith(3, 'utilityMeter', meters[1]);
    expect(result).toBe(fuel);
  });

  it('rejects an atomic fuel rename when a record is missing its persisted id', async () => {
    const { handler, transactions } = createHandler();
    const fuel = { guid: 'cf-1', accountId: ACCOUNT, value: 'Renamed' } as IdbCustomFuel;

    await expect(handler.updateCustomFuelWithMeters(fuel, [], ACCOUNT))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('rejects an atomic fuel rename when a persisted id is not finite', async () => {
    const { handler, transactions } = createHandler();
    const fuel = { id: Number.NaN, guid: 'cf-1', accountId: ACCOUNT, value: 'Renamed' } as IdbCustomFuel;

    await expect(handler.updateCustomFuelWithMeters(fuel, [], ACCOUNT))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('deleteCustomGWP rejects cross-account GWP', async () => {
    const { handler, customGWPDb } = createHandler();
    await expect(
      handler.deleteCustomGWP({ id: 5, guid: 'gwp-1', accountId: 'other' } as IdbCustomGWP, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(customGWPDb.deleteWithObservable).not.toHaveBeenCalled();
  });
});
