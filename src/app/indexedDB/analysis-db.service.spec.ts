import { of } from 'rxjs';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { AnalysisDbService } from './analysis-db.service';

describe('AnalysisDbService', () => {
  let service: AnalysisDbService;
  let dbService: jasmine.SpyObj<any>;

  beforeEach(() => {
    dbService = jasmine.createSpyObj('NgxIndexedDBService', ['add', 'update']);
    dbService.add.and.callFake((_storeName: string, item: IdbAnalysisItem) => of(item));
    dbService.update.and.callFake((_storeName: string, item: IdbAnalysisItem) => of(item));
    service = new AnalysisDbService(
      dbService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should omit a legacy calculated report year when adding or updating an analysis item', () => {
    const analysisItem = {
      guid: 'analysis-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAnalysisItem;

    service.addWithObservable(analysisItem).subscribe();
    service.updateWithObservable(analysisItem).subscribe();

    const addedItem = dbService.add.calls.mostRecent().args[1] as IdbAnalysisItem & { calculatedReportYear?: number };
    const updatedItem = dbService.update.calls.mostRecent().args[1] as IdbAnalysisItem & { calculatedReportYear?: number };
    expect(addedItem.calculatedReportYear).toBeUndefined();
    expect(updatedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
