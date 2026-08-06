import { firstValueFrom, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { IndexedDbAccessService } from './indexed-db-access.service';

describe('AccountAnalysisDbService', () => {
  let service: AccountAnalysisDbService;
  let dbService: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dbService = {
      add: vi.fn((_storeName: string, item: IdbAccountAnalysisItem) => of(item)),
      update: vi.fn((_storeName: string, item: IdbAccountAnalysisItem) => of(item))
    };
    service = TestBed.runInInjectionContext(() => new AccountAnalysisDbService(
      dbService as any,
      {} as any,
      new IndexedDbAccessService(dbService as any)
    ));
  });

  it('omits a legacy calculated report year when adding or updating an account analysis item', async () => {
    const analysisItem = {
      guid: 'account-analysis-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAccountAnalysisItem;

    await firstValueFrom(service.addWithObservable(analysisItem));
    await firstValueFrom(service.updateWithObservable(analysisItem));

    const addedItem = dbService.add.mock.calls.at(-1)?.[1] as IdbAccountAnalysisItem & { calculatedReportYear?: number };
    const updatedItem = dbService.update.mock.calls.at(-1)?.[1] as IdbAccountAnalysisItem & { calculatedReportYear?: number };
    expect(dbService.add).toHaveBeenCalledWith('accountAnalysisItems', addedItem);
    expect(dbService.update).toHaveBeenCalledWith('accountAnalysisItems', updatedItem);
    expect(addedItem.calculatedReportYear).toBeUndefined();
    expect(updatedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAccountAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
