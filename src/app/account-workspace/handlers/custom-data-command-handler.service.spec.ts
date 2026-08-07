import { of } from 'rxjs';
import { vi } from 'vitest';
import { CustomDataCommandHandler } from './custom-data-command-handler.service';
import { IdbCustomEmissionsItem } from '../../models/idbModels/customEmissions';
import { IdbCustomFuel } from '../../models/idbModels/customFuel';
import { IdbCustomGWP } from '../../models/idbModels/customGWP';

const ACCOUNT = 'acct-1';

describe('CustomDataCommandHandler', () => {
  function createHandler() {
    const customEmissionsDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const customFuelDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const customGWPDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const handler = new CustomDataCommandHandler(customEmissionsDb as any, customFuelDb as any, customGWPDb as any);
    return { handler, customEmissionsDb, customFuelDb, customGWPDb };
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

  it('deleteCustomGWP rejects cross-account GWP', async () => {
    const { handler, customGWPDb } = createHandler();
    await expect(
      handler.deleteCustomGWP({ id: 5, guid: 'gwp-1', accountId: 'other' } as IdbCustomGWP, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(customGWPDb.deleteWithObservable).not.toHaveBeenCalled();
  });
});
