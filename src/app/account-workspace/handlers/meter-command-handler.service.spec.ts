import { of } from 'rxjs';
import { vi } from 'vitest';
import { MeterCommandHandler } from './meter-command-handler.service';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { IdbUtilityMeter } from '../../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';

const ACCOUNT = 'acct-1';

describe('MeterCommandHandler', () => {
  function createHandler() {
    const meterDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn(),
      deleteIndexWithObservable: vi.fn()
    };
    const meterDataDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn(),
      deleteWithObservable: vi.fn()
    };
    const meterGroupDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn(),
      deleteWithObservable: vi.fn()
    };
    const transactions = {
      runTransaction: vi.fn()
    };
    const handler = new MeterCommandHandler(meterDb as any, meterDataDb as any, meterGroupDb as any, transactions as any);
    return { handler, meterDb, meterDataDb, meterGroupDb, transactions };
  }

  describe('meter', () => {
    it('addMeter persists and returns the new meter', async () => {
      const { handler, meterDb } = createHandler();
      const meter = { guid: 'm-1', accountId: ACCOUNT } as IdbUtilityMeter;
      meterDb.addWithObservable.mockReturnValue(of({ ...meter, id: 1 }));

      const result = await handler.addMeter(meter, ACCOUNT);

      expect(result.id).toBe(1);
    });

    it('updateMeter rejects cross-account meter', async () => {
      const { handler, meterDb } = createHandler();
      const meter = { guid: 'm-1', accountId: 'other' } as IdbUtilityMeter;

      await expect(handler.updateMeter(meter, ACCOUNT)).rejects.toMatchObject({ code: 'cross-account-entity' });
      expect(meterDb.updateWithObservable).not.toHaveBeenCalled();
    });

    it('deleteMeter returns the meter id', async () => {
      const { handler, meterDb } = createHandler();
      const meter = { id: 7, guid: 'm-1', accountId: ACCOUNT } as IdbUtilityMeter;
      meterDb.deleteIndexWithObservable.mockReturnValue(of(undefined));

      const result = await handler.deleteMeter(meter, ACCOUNT);

      expect(result).toBe(7);
    });

    it('deleteMeter rejects cross-account meter', async () => {
      const { handler, meterDb } = createHandler();
      const meter = { id: 7, guid: 'm-1', accountId: 'other' } as IdbUtilityMeter;

      await expect(handler.deleteMeter(meter, ACCOUNT)).rejects.toMatchObject({ code: 'cross-account-entity' });
      expect(meterDb.deleteIndexWithObservable).not.toHaveBeenCalled();
    });
  });

  describe('meterData', () => {
    it('addMeterData persists and returns the new entry', async () => {
      const { handler, meterDataDb } = createHandler();
      const data = { guid: 'd-1', accountId: ACCOUNT } as IdbUtilityMeterData;
      meterDataDb.addWithObservable.mockReturnValue(of({ ...data, id: 2 }));

      const result = await handler.addMeterData(data, ACCOUNT);
      expect(result.id).toBe(2);
    });

    it('deleteMeterData returns the id', async () => {
      const { handler, meterDataDb } = createHandler();
      meterDataDb.deleteWithObservable.mockReturnValue(of(undefined));

      const result = await handler.deleteMeterData(42);
      expect(result).toBe(42);
    });
  });

  describe('meterGroup', () => {
    it('updateMeterGroup rejects cross-account group', async () => {
      const { handler, meterGroupDb } = createHandler();
      const group = { guid: 'g-1', accountId: 'other' } as IdbUtilityMeterGroup;

      await expect(handler.updateMeterGroup(group, ACCOUNT)).rejects.toMatchObject({ code: 'cross-account-entity' });
      expect(meterGroupDb.updateWithObservable).not.toHaveBeenCalled();
    });
  });
});
