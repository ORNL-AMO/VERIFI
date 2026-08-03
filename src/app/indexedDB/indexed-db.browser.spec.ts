import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NgxIndexedDBService, provideIndexedDb } from 'ngx-indexed-db';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { dbConfig } from './_dbConfig';
import { AnalysisDbService } from './analysis-db.service';

describe('IndexedDB in Chromium', () => {
  let dbService: NgxIndexedDBService;
  let analysisDbService: AnalysisDbService;

  beforeEach(async () => {
    const testConfig = {
      ...dbConfig,
      name: `verifi-test-${crypto.randomUUID()}`
    };

    TestBed.configureTestingModule({
      providers: [provideIndexedDb(testConfig)]
    });

    dbService = TestBed.inject(NgxIndexedDBService);
    analysisDbService = new AnalysisDbService(
      dbService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    await firstValueFrom(dbService.getDatabaseVersion());
  });

  afterEach(async () => {
    await firstValueFrom(dbService.deleteDatabase());
    TestBed.resetTestingModule();
  });

  it('round-trips an analysis item without persisting transient fields', async () => {
    const analysisItem = {
      guid: 'analysis-guid',
      accountId: 'account-guid',
      facilityId: 'facility-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAnalysisItem;

    const addedItem = await firstValueFrom(
      analysisDbService.addWithObservable(analysisItem)
    );
    const persistedItem = await firstValueFrom(
      analysisDbService.getById(addedItem.id)
    ) as IdbAnalysisItem & { calculatedReportYear?: number };

    expect(persistedItem).toMatchObject({
      id: addedItem.id,
      guid: analysisItem.guid,
      accountId: analysisItem.accountId,
      facilityId: analysisItem.facilityId
    });
    expect(persistedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
