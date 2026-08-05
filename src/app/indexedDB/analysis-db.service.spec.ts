import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { AnalysisDbService } from './analysis-db.service';
import { IndexedDbAccessService } from './indexed-db-access.service';

describe('AnalysisDbService', () => {
  let service: AnalysisDbService;
  let dbService: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dbService = {
      add: vi.fn((_storeName: string, item: IdbAnalysisItem) => of(item)),
      update: vi.fn((_storeName: string, item: IdbAnalysisItem) => of(item))
    };
    service = new AnalysisDbService(
      dbService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new IndexedDbAccessService(dbService as any)
    );
  });

  it('omits a legacy calculated report year when adding or updating an analysis item', async () => {
    const analysisItem = {
      guid: 'analysis-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAnalysisItem;

    await firstValueFrom(service.addWithObservable(analysisItem));
    await firstValueFrom(service.updateWithObservable(analysisItem));

    const addedItem = dbService.add.mock.calls.at(-1)?.[1] as IdbAnalysisItem & { calculatedReportYear?: number };
    const updatedItem = dbService.update.mock.calls.at(-1)?.[1] as IdbAnalysisItem & { calculatedReportYear?: number };
    expect(dbService.add).toHaveBeenCalledWith('analysisItems', addedItem);
    expect(dbService.update).toHaveBeenCalledWith('analysisItems', updatedItem);
    expect(addedItem.calculatedReportYear).toBeUndefined();
    expect(updatedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
