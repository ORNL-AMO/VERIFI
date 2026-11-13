import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { AnnualAnalysisSummaryComponent } from './annual-analysis-summary.component';
import { MonthlyAnalysisSummaryComponent } from '../monthly-analysis-summary/monthly-analysis-summary.component';

@NgModule({
  imports: [CommonModule],
  declarations: [AnnualAnalysisSummaryComponent, MonthlyAnalysisSummaryComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class SummaryBrowserTestModule {}

describe('Group summary committed results in Chromium', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  for (const componentType of [AnnualAnalysisSummaryComponent, MonthlyAnalysisSummaryComponent]) {
    it(`updates mounted ${componentType.name} after a delayed coefficient commit while reusing raw calendarization`, async () => {
      const NativeWorker = globalThis.Worker;
      const requests: any[] = [];
      class CountingWorker extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          // Vitest rebases import.meta.url to source directories; Angular emits these assets at the bundle root.
          const asset = new URL(new URL(String(url)).pathname.split('/').pop()!, location.origin + '/');
          super(asset, options);
        }
        override postMessage(message: unknown): void {
          requests.push(structuredClone(message));
          super.postMessage(message);
        }
      }
      vi.stubGlobal('Worker', CountingWorker);
      const { store, calendarization, fixture, component } = setup(componentType);
      fixture.detectChanges();
      await vi.waitFor(() => {
        expect(component.calculating()).toBe(false);
        expect(calendarization.isReadyForCurrentWorkspace()).toBe(true);
      });
      const before = result(component);
      expect(before.length).toBeGreaterThan(0);
      expect(requests.filter(request => 'allMeterData' in request)).toHaveLength(1);
      const current = store.selectedFacilityAnalysis();
      const updated = { ...current, groups: current.groups.map(group => ({ ...group, regressionConstant: 40 })) };
      // The result view is already mounted, as when a queued editor save commits after navigation.
      store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [updated] }] });
      fixture.detectChanges();
      await vi.waitFor(() => expect(component.calculating()).toBe(false));
      const after = result(component);
      expect(after).not.toEqual(before);
      expect(requests.filter(request => 'allMeterData' in request)).toHaveLength(1);
      expect(requests.filter(request => 'selectedGroup' in request)).toHaveLength(2);
      expect(requests.at(-1).selectedGroup.regressionConstant).toBe(40);
      const committedSnapshot = structuredClone(store.snapshot());
      vi.stubGlobal('Worker', undefined);
      component.retryCalculation();
      expect(component.calculating()).toBe(false);
      expect(result(component)).toEqual(after);
      expect(store.snapshot()).toEqual(committedSnapshot);
      fixture.destroy();
    });

    it(`recovers ${componentType.name} from a native Worker error with a fresh request`, async () => {
      const NativeWorker = globalThis.Worker;
      const failingUrl = URL.createObjectURL(new Blob(['throw new Error("native summary failure")'], { type: 'text/javascript' }));
      let failSummary = true;
      class RecoverableWorker extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          const asset = new URL(new URL(String(url)).pathname.split('/').pop()!, location.origin + '/');
          super(failSummary ? failingUrl : asset, options);
        }
      }
      vi.stubGlobal('Worker', RecoverableWorker);
      try {
        const { fixture, component } = setup(componentType, false);
        fixture.detectChanges();
        await vi.waitFor(() => expect(component.calculating()).toBe('error'));
        failSummary = false;
        component.retryCalculation();
        await vi.waitFor(() => expect(component.calculating()).toBe(false));
        expect(result(component).length).toBeGreaterThan(0);
        fixture.destroy();
      } finally {
        URL.revokeObjectURL(failingUrl);
      }
    });
  }
});

function setup(componentType: Type<AnnualAnalysisSummaryComponent | MonthlyAnalysisSummaryComponent>, withCalendarization = true) {
  const snapshot = createSnapshot();
  const displays = new Map<string, BehaviorSubject<'table' | 'graph'>>();
  TestBed.configureTestingModule({
    imports: [SummaryBrowserTestModule],
    providers: [AccountWorkspaceStore, CalanderizationService,
      { provide: AnalysisService, useValue: {
        selectedGroup: new BehaviorSubject(snapshot.facilityAnalyses[0].groups[0]),
        getDisplaySubject: (key: string, initial: 'table' | 'graph') => {
          if (!displays.has(key)) displays.set(key, new BehaviorSubject(initial));
          return displays.get(key);
        }
      } },
      { provide: SharedDataService, useValue: { itemsPerPage: new BehaviorSubject(25) } }
    ]
  }).overrideComponent(AnnualAnalysisSummaryComponent, { set: { template: '<p>{{ calculating() }}</p>' } })
    .overrideComponent(MonthlyAnalysisSummaryComponent, { set: { template: '<p>{{ calculating() }}</p>' } });
  const store = TestBed.inject(AccountWorkspaceStore);
  store.publish(snapshot, { facility: snapshot.facilities[0], facilityAnalysis: snapshot.facilityAnalyses[0] });
  const calendarization = withCalendarization ? TestBed.inject(CalanderizationService) : undefined;
  const fixture = TestBed.createComponent(componentType);
  return { store, calendarization, fixture, component: fixture.componentInstance };
}

function result(component: AnnualAnalysisSummaryComponent | MonthlyAnalysisSummaryComponent) {
  return component instanceof AnnualAnalysisSummaryComponent
    ? component.annualAnalysisSummary()
    : component.monthlyAnalysisSummary()?.monthlyAnalysisSummaryData;
}

function createSnapshot(): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', fiscalYear: 'calendarYear' as const };
  const meter = { ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu'), guid: 'meter-a', groupId: 'group-a',
    source: 'Natural Gas' as const, startingUnit: 'MMBtu', meterReadingDataApplication: 'fullMonth' as const, includeInEnergy: true };
  const predictor = { ...getNewIdbPredictor(account.guid, facility.guid), guid: 'predictor-a', name: 'Production', unit: 'tons', production: true };
  const analysis = { ...getNewIdbAnalysisItem(account, facility, [], [], 'energy'), id: 1, guid: 'analysis-a', baselineYear: 2022,
    groups: [{ ...getNewAnalysisGroup('group-a', [{ id: predictor.guid, name: predictor.name, unit: predictor.unit, production: true,
      productionInAnalysis: true, regressionCoefficient: 1 }]), isGeneratedModel: false, regressionConstant: 10, regressionModelYear: 2022,
      regressionModelStartMonth: 0, regressionStartYear: 2022, regressionModelEndMonth: 11, regressionEndYear: 2022 }] };
  const months = [2022, 2023].flatMap(year => Array.from({ length: 12 }, (_, month) => ({ year, month })));
  return {
    account, facilities: [facility], meters: [meter],
    meterData: months.map(({ year, month }) => ({ ...getNewIdbUtilityMeterData(meter, []), year, month: month + 1, day: 1,
      totalEnergyUse: year === 2022 ? 100 : 110, totalCost: 25 })),
    meterGroups: [], predictors: [predictor],
    predictorData: months.map(({ year, month }) => ({ ...getNewIdbPredictorData(predictor), year, month: month + 1,
      amount: year === 2022 ? 10 : 20 })),
    facilityAnalyses: [analysis], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [],
    customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
  };
}
