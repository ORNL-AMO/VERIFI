import { of } from 'rxjs';
import { vi } from 'vitest';
import { FacilityCommandHandler } from './facility-command-handler.service';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { IdbFacility } from '../../models/idbModels/facility';
import { IdbAccountAnalysisItem } from '../../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../../models/idbModels/accountReport';

describe('FacilityCommandHandler', () => {
  function createHandler() {
    const facilityDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn()
    };
    const accountAnalysisDb = { updateWithObservable: vi.fn() };
    const accountReportDb = { updateWithObservable: vi.fn() };
    const cascadeDelete = { deleteFacility: vi.fn() };
    const handler = new FacilityCommandHandler(
      facilityDb as any,
      accountAnalysisDb as any,
      accountReportDb as any,
      cascadeDelete as any
    );
    return { handler, facilityDb, accountAnalysisDb, accountReportDb, cascadeDelete };
  }

  const ACCOUNT_GUID = 'acct-1';

  it('add persists the facility and patches account analyses and reports', async () => {
    const { handler, facilityDb, accountAnalysisDb, accountReportDb } = createHandler();
    const facility = { guid: 'fac-1', accountId: ACCOUNT_GUID } as IdbFacility;
    const added = { ...facility, id: 1 };
    facilityDb.addWithObservable.mockReturnValue(of(added));
    accountAnalysisDb.updateWithObservable.mockReturnValue(of({}));
    accountReportDb.updateWithObservable.mockReturnValue(of({}));

    const analysis = {
      guid: 'analysis-1',
      facilityAnalysisItems: [{ facilityId: 'existing-fac', analysisItemId: undefined }]
    } as unknown as IdbAccountAnalysisItem;
    const report = { guid: 'report-1', dataOverviewReportSetup: { includedFacilities: [] } } as unknown as IdbAccountReport;

    const result = await handler.add(facility, ACCOUNT_GUID, [analysis], [report]);

    expect(result.facility).toEqual(added);
    expect(accountAnalysisDb.updateWithObservable).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityAnalysisItems: expect.arrayContaining([
          expect.objectContaining({ facilityId: 'fac-1' })
        ])
      })
    );
    expect(accountReportDb.updateWithObservable).toHaveBeenCalledWith(
      expect.objectContaining({
        dataOverviewReportSetup: expect.objectContaining({
          includedFacilities: expect.arrayContaining([
            expect.objectContaining({ facilityId: 'fac-1', included: false })
          ])
        })
      })
    );
  });

  it('update persists and returns the updated facility', async () => {
    const { handler, facilityDb } = createHandler();
    const facility = { guid: 'fac-1', accountId: ACCOUNT_GUID } as IdbFacility;
    const persisted = { ...facility, name: 'Updated' };
    facilityDb.updateWithObservable.mockReturnValue(of(persisted));

    const result = await handler.update(facility, ACCOUNT_GUID);

    expect(result).toEqual(persisted);
  });

  it('add rejects cross-account entity before any repository call', async () => {
    const { handler, facilityDb, accountAnalysisDb, accountReportDb } = createHandler();
    const facility = { guid: 'fac-1', accountId: 'other-acct' } as IdbFacility;

    await expect(handler.add(facility, ACCOUNT_GUID, [], [])).rejects.toMatchObject({
      code: 'cross-account-entity'
    });
    expect(facilityDb.addWithObservable).not.toHaveBeenCalled();
    expect(accountAnalysisDb.updateWithObservable).not.toHaveBeenCalled();
    expect(accountReportDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('update rejects cross-account entity before any repository call', async () => {
    const { handler, facilityDb } = createHandler();
    const facility = { guid: 'fac-1', accountId: 'other-acct' } as IdbFacility;

    await expect(handler.update(facility, ACCOUNT_GUID)).rejects.toMatchObject({
      code: 'cross-account-entity'
    });
    expect(facilityDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('delete triggers cascade and reports the facility id', async () => {
    const { handler, cascadeDelete } = createHandler();
    const facility = { id: 5, guid: 'fac-1', accountId: ACCOUNT_GUID } as IdbFacility;
    cascadeDelete.deleteFacility.mockResolvedValue(undefined);

    const result = await handler.delete(facility, ACCOUNT_GUID);

    expect(cascadeDelete.deleteFacility).toHaveBeenCalledWith(facility, ACCOUNT_GUID, expect.any(Function));
    expect(result.facilityId).toBe(5);
  });

  it('delete rejects cross-account entity before cascade', async () => {
    const { handler, cascadeDelete } = createHandler();
    const facility = { id: 5, guid: 'fac-1', accountId: 'other-acct' } as IdbFacility;

    await expect(handler.delete(facility, ACCOUNT_GUID)).rejects.toMatchObject({
      code: 'cross-account-entity'
    });
    expect(cascadeDelete.deleteFacility).not.toHaveBeenCalled();
  });
});
