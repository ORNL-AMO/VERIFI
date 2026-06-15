import { Component, computed, DestroyRef, inject, OnInit, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisService } from '../../analysis.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { toSignal } from '@angular/core/rxjs-interop';
import { runWorker } from 'src/app/web-workers/run-worker';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';

@Component({
  selector: 'app-facility-analysis',
  templateUrl: './facility-analysis.component.html',
  styleUrls: ['./facility-analysis.component.css'],
  standalone: false
})
export class FacilityAnalysisComponent implements OnInit {
  private readonly analysisDbService = inject(AnalysisDbService);
  private readonly facilityDbService = inject(FacilitydbService);
  private readonly analysisService = inject(AnalysisService);
  private readonly predictorDbService = inject(PredictorDbService);
  private readonly predictorDataDbService = inject(PredictorDataDbService);
  private readonly utilityMeterDbService = inject(UtilityMeterdbService);
  private readonly utilityMeterDataDbService = inject(UtilityMeterDatadbService);
  private readonly accountDbService = inject(AccountdbService);
  private readonly customGWPDbService = inject(CustomGWPDbService);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  private readonly analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);

  readonly analysisStatusCheck: Signal<AnalysisStatusCheck> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) { return undefined; }
    return facilityStatusCheck.getAnalysisStatusById(analysisItem.guid);
  });

  readonly hasGroupSetupErrors: Signal<boolean> = computed(() =>
    this.analysisStatusCheck()?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasErrors) ?? false
  );

  readonly hasGroupModelWarnings: Signal<boolean> = computed(() =>
    this.analysisStatusCheck()?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasRegressionErrors) ?? false
  );

  ngOnInit(): void {
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const accountAnalysisItems: IdbAnalysisItem[] = this.analysisDbService.accountAnalysisItems.getValue();
    const customGWPs: IdbCustomGWP[] = this.customGWPDbService.accountCustomGWPs.getValue();
    const facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    const facilityMeters: IdbUtilityMeter[] = this.utilityMeterDbService.facilityMeters.getValue();
    const facilityMeterData: IdbUtilityMeterData[] = this.utilityMeterDataDbService.facilityMeterData.getValue();
    const accountPredictorEntries: IdbPredictorData[] = this.predictorDataDbService.accountPredictorData.getValue();
    const accountPredictors: IdbPredictor[] = this.predictorDbService.accountPredictors.getValue();
    const account: IdbAccount = this.accountDbService.selectedAccount.getValue();

    const payload = {
      analysisItem,
      facility,
      meters: facilityMeters,
      meterData: facilityMeterData,
      accountPredictorEntries,
      calculateAllMonthlyData: false,
      accountPredictors,
      accountAnalysisItems,
      includeGroupSummaries: true,
      assessmentReportVersion: account.assessmentReportVersion,
      customGWPs
    };

    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../../web-workers/annual-facility-analysis.worker', import.meta.url));
      this.analysisService.calculating.next(true);
      runWorker<any>(worker, payload).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (data) => {
          if (!data.error) {
            this.analysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
            this.analysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
            this.analysisService.groupSummaries.next(data.groupSummaries);
            this.analysisService.calculating.next(false);
          } else {
            this.analysisService.annualAnalysisSummary.next(undefined);
            this.analysisService.monthlyAccountAnalysisData.next(undefined);
            this.analysisService.groupSummaries.next(undefined);
            this.analysisService.calculating.next('error');
          }
        },
        error: () => {
          this.analysisService.annualAnalysisSummary.next(undefined);
          this.analysisService.monthlyAccountAnalysisData.next(undefined);
          this.analysisService.groupSummaries.next(undefined);
          this.analysisService.calculating.next('error');
        }
      });
    } else {
      // Web Workers not supported — run synchronously on the main thread
      const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(
        facilityMeters, facilityMeterData, facility, false,
        { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) },
        [], [], [facility], account.assessmentReportVersion, customGWPs
      );
      const annualAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(
        analysisItem, facility, calanderizedMeters, accountPredictorEntries,
        false, accountPredictors, accountAnalysisItems, false
      );
      const annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      const monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      const groupSummaries: Array<{
        group: AnalysisGroup,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
      }> = annualAnalysisSummaryClass.groupSummaries;
      this.analysisService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.analysisService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
      this.analysisService.groupSummaries.next(groupSummaries);
      this.analysisService.calculating.next(false);
    }
  }
}
