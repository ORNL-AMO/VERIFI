import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { AnalysisGroup, IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, PredictorData } from '../../models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  selectedGroup: BehaviorSubject<AnalysisGroup>;
  dataDisplay: BehaviorSubject<"graph" | "table">;

  analysisTableColumns: BehaviorSubject<AnalysisTableColumns>;
  calanderizedMeters: Array<CalanderizedMeter>;
  showInvalidModels: BehaviorSubject<boolean>;
  calculating: BehaviorSubject<boolean>;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyAccountAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  accountAnalysisItem: IdbAccountAnalysisItem;
  constructor(private localStorageService: LocalStorageService, private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, private analysisDbService: AnalysisDbService) {
    let dataDisplay: "graph" | "table" = this.localStorageService.retrieve("analysisDataDisplay");
    if (!dataDisplay) {
      dataDisplay = "table";
    }
    this.selectedGroup = new BehaviorSubject<AnalysisGroup>(undefined);
    this.dataDisplay = new BehaviorSubject<"graph" | "table">(dataDisplay);
    this.showInvalidModels = new BehaviorSubject<boolean>(false);
    this.calculating = new BehaviorSubject<boolean>(true);
    this.annualAnalysisSummary = new BehaviorSubject([]);
    this.monthlyAccountAnalysisData = new BehaviorSubject([]);


    let analysisTableColumns: AnalysisTableColumns = this.localStorageService.retrieve("analysisTableColumns");
    if (!analysisTableColumns) {
      analysisTableColumns = {
        incrementalImprovement: false,
        SEnPI: false,
        savings: false,
        percentSavingsComparedToBaseline: false,
        yearToDateSavings: false,
        yearToDatePercentSavings: false,
        rollingSavings: false,
        rolling12MonthImprovement: false,
        productionVariables: true,
        energy: true,
        actualEnergy: true,
        modeledEnergy: true,
        adjustedForNormalization: true,
        adjusted: true,
        baselineAdjustmentForNormalization: true,
        baselineAdjustmentForOther: true,
        baselineAdjustment: true,
        totalSavingsPercentImprovement: true,
        annualSavingsPercentImprovement: true,
        adjustmentToBaseline: true,
        cummulativeSavings: true,
        newSavings: true,
        predictors: [],
        predictorGroupId: undefined
      }
    }
    this.analysisTableColumns = new BehaviorSubject<AnalysisTableColumns>(analysisTableColumns);


    this.dataDisplay.subscribe(dataDisplay => {
      if (dataDisplay) {
        this.localStorageService.store('analysisDataDisplay', dataDisplay);
      }
    });

    this.analysisTableColumns.subscribe(analysisTableColumns => {
      if (analysisTableColumns) {
        this.localStorageService.store('analysisTableColumns', analysisTableColumns);
      }
    });


    // this.monthlyTableColumns.subscribe(annualTableColumns => {
    //   if (annualTableColumns) {
    //     this.localStorageService.store('annualTableColumns', monthlyTableColumns);
    //   }
    // });
  }

  setBaselineAdjustments(facility: IdbFacility, analysisItem: IdbAnalysisItem): IdbAnalysisItem {
    if (facility.sustainabilityQuestions.energyReductionBaselineYear < analysisItem.reportYear) {
      let yearAdjustments: Array<{ year: number, amount: number }> = new Array();
      for (let year: number = facility.sustainabilityQuestions.energyReductionBaselineYear + 1; year <= analysisItem.reportYear; year++) {
        yearAdjustments.push({
          year: year,
          amount: 0
        })
      }
      analysisItem.groups.forEach(group => {
        group.baselineAdjustments = yearAdjustments;
      });
    }
    return analysisItem;
  }

  checkFiscalYearEnd(date: Date, facilityOrAccount: IdbFacility | IdbAccount, orderDataField: string, orderByDirection: 'asc' | 'desc'): boolean {
    if (orderDataField == 'date' || orderDataField == 'fiscalYear') {
      if (facilityOrAccount.fiscalYear == 'calendarYear' && (orderByDirection == 'asc' || orderDataField == 'fiscalYear')) {
        return date.getUTCMonth() == 0;
      } else if (facilityOrAccount.fiscalYear == 'calendarYear' && orderByDirection == 'desc') {
        return date.getUTCMonth() == 11;
      } else {
        if (date.getUTCMonth() == facilityOrAccount.fiscalYearMonth && orderByDirection == 'asc') {
          return true;
        } else if (date.getUTCMonth() + 1 == facilityOrAccount.fiscalYearMonth && orderByDirection == 'desc') {
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }


  setCalanderizedMeters() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, selectedFacility, calanderizedMeter.meter);
    });
    this.calanderizedMeters = calanderizedMeterData;
  }
}
