import { of } from 'rxjs';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from './account-analysis-db.service';

describe('AccountAnalysisDbService', () => {
  let service: AccountAnalysisDbService;
  let dbService: jasmine.SpyObj<any>;

  beforeEach(() => {
    dbService = jasmine.createSpyObj('NgxIndexedDBService', ['add', 'update']);
    dbService.add.and.callFake((_storeName: string, item: IdbAccountAnalysisItem) => of(item));
    dbService.update.and.callFake((_storeName: string, item: IdbAccountAnalysisItem) => of(item));
    service = new AccountAnalysisDbService(dbService, {} as any, {} as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should omit a legacy calculated report year when adding or updating an account analysis item', () => {
    const analysisItem = {
      guid: 'account-analysis-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAccountAnalysisItem;

    service.addWithObservable(analysisItem).subscribe();
    service.updateWithObservable(analysisItem).subscribe();

    const addedItem = dbService.add.calls.mostRecent().args[1] as IdbAccountAnalysisItem & { calculatedReportYear?: number };
    const updatedItem = dbService.update.calls.mostRecent().args[1] as IdbAccountAnalysisItem & { calculatedReportYear?: number };
    expect(addedItem.calculatedReportYear).toBeUndefined();
    expect(updatedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAccountAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
