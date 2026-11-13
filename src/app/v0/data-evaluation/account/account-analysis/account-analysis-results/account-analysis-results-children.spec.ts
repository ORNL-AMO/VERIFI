import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AnnualAccountAnalysisComponent } from './annual-account-analysis/annual-account-analysis.component';
import { MonthlyAccountAnalysisComponent } from './monthly-account-analysis/monthly-account-analysis.component';
import { AccountAnalysisFacilitiesSummaryComponent } from './account-analysis-facilities-summary/account-analysis-facilities-summary.component';

@NgModule({ declarations: [AnnualAccountAnalysisComponent, MonthlyAccountAnalysisComponent, AccountAnalysisFacilitiesSummaryComponent], imports: [CommonModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class AccountResultChildrenTestModule { }

describe('Account result presentation identity', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('passes current units and baseline to all mounted account result views', () => {
    const store = new AccountWorkspaceStore();
    const item = { id: 1, guid: 'analysis-a', accountId: 'account-a', energyUnit: 'MMBtu', baselineYear: 2020 } as IdbAccountAnalysisItem;
    store.publish({ account: { id: 1, guid: 'account-a' }, facilities: [], accountAnalyses: [item], facilityAnalyses: [],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountReports: [], facilityReports: [],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: [] } as unknown as AccountWorkspaceSnapshot,
      { accountAnalysis: item });
    const results = new AccountAnalysisService();
    results.calculating.next(false);
    results.facilitySummaries.next([{ facility: { guid: 'facility-a' } as any, analysisItem: {} as any, monthlySummaryData: [] }]);
    const displays = new Map<string, BehaviorSubject<'table' | 'graph'>>();
    TestBed.configureTestingModule({ imports: [AccountResultChildrenTestModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountAnalysisService, useValue: results },
      { provide: AnalysisService, useValue: { getDisplaySubject: (key: string, initial: 'table' | 'graph') => {
        if (!displays.has(key)) displays.set(key, new BehaviorSubject(initial));
        return displays.get(key)!;
      } } },
      { provide: SharedDataService, useValue: { itemsPerPage: new BehaviorSubject(12) } }
    ] });
    const annual = TestBed.createComponent(AnnualAccountAnalysisComponent);
    const monthly = TestBed.createComponent(MonthlyAccountAnalysisComponent);
    const facilities = TestBed.createComponent(AccountAnalysisFacilitiesSummaryComponent);
    [annual, monthly, facilities].forEach(fixture => fixture.detectChanges());
    const changed = { ...item, energyUnit: 'kWh', baselineYear: 2022 };
    store.publishCommittedPatch(upsertWorkspaceRecords('accountAnalyses', [changed]));
    [annual, monthly, facilities].forEach(fixture => fixture.detectChanges());
    const annualTable = annual.nativeElement.querySelector('app-annual-analysis-summary-table');
    const monthlyGraph = monthly.nativeElement.querySelector('app-monthly-analysis-summary-graph');
    const facilityGraph = facilities.nativeElement.querySelector('app-monthly-analysis-summary-graph');
    [annualTable, monthlyGraph, facilityGraph].forEach(view => {
      expect(view).not.toBeNull();
      expect(view.analysisItem).toMatchObject({ energyUnit: 'kWh', baselineYear: 2022 });
    });
  });
});
