import { of } from 'rxjs';
import { vi } from 'vitest';
import { ReportCommandHandler } from './report-command-handler.service';
import { IdbFacilityReport } from '../../models/idbModels/facilityReport';
import { IdbAccountReport } from '../../models/idbModels/accountReport';

const ACCOUNT = 'acct-1';

describe('ReportCommandHandler', () => {
  function createHandler() {
    const facilityReportDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountReportDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const handler = new ReportCommandHandler(facilityReportDb as any, accountReportDb as any);
    return { handler, facilityReportDb, accountReportDb };
  }

  it('addFacilityReport persists and returns the new report', async () => {
    const { handler, facilityReportDb } = createHandler();
    facilityReportDb.addWithObservable.mockReturnValue(of({ guid: 'fr-1', id: 1 }));
    const result = await handler.addFacilityReport({ guid: 'fr-1', accountId: ACCOUNT } as IdbFacilityReport);
    expect(result.id).toBe(1);
  });

  it('updateFacilityReport rejects cross-account report', async () => {
    const { handler, facilityReportDb } = createHandler();
    await expect(
      handler.updateFacilityReport({ guid: 'fr-1', accountId: 'other' } as IdbFacilityReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(facilityReportDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deleteFacilityReport returns the id and rejects cross-account', async () => {
    const { handler, facilityReportDb } = createHandler();
    facilityReportDb.deleteWithObservable.mockReturnValue(of(undefined));
    const result = await handler.deleteFacilityReport({ id: 5, guid: 'fr-1', accountId: ACCOUNT } as IdbFacilityReport, ACCOUNT);
    expect(result).toBe(5);

    await expect(
      handler.deleteFacilityReport({ id: 5, guid: 'fr-1', accountId: 'other' } as IdbFacilityReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
  });

  it('addAccountReport persists and returns the new report', async () => {
    const { handler, accountReportDb } = createHandler();
    accountReportDb.addWithObservable.mockReturnValue(of({ guid: 'ar-1', id: 2 }));
    const result = await handler.addAccountReport({ guid: 'ar-1', accountId: ACCOUNT } as IdbAccountReport);
    expect(result.id).toBe(2);
  });

  it('deleteAccountReport rejects cross-account report', async () => {
    const { handler, accountReportDb } = createHandler();
    await expect(
      handler.deleteAccountReport({ id: 6, guid: 'ar-1', accountId: 'other' } as IdbAccountReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(accountReportDb.deleteWithObservable).not.toHaveBeenCalled();
  });
});
