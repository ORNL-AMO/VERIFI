import { Injectable } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import { FacilityAnalysisCalculationsService } from './facility-analysis-calculations.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisCalculationsService {

  constructor(private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService) { }

  calculatMonthlyAccountAnalysis(accountAnalysisItem: IdbAccountAnalysisItem, account: IdbAccount): Array<MonthlyAnalysisSummaryData>{
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(account, accountAnalysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();

    let allAccountAnalysisDbItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    accountAnalysisItem.facilityAnalysisItems.forEach(item => {
      let analysisItem: IdbAnalysisItem = allAccountAnalysisDbItems.find(dbItem => {return dbItem.id == item.analysisItemId});
      //update items with account options
      analysisItem.energyUnit = accountAnalysisItem.energyUnit;

      let facility: IdbFacility = accountFacilities.find(facility => {return facility.id == item.facilityId});
      let facilityItemSummary: Array<MonthlyAnalysisSummaryData> = this.facilityAnalysisCalculationsService.calculateMonthlyFacilityAnalysis(analysisItem, facility);
      monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.concat(facilityItemSummary);
    })

    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, account);


    let baselineActualEnergyUseData: Array<number> = new Array();
    let baselineModeledEnergyUseData: Array<number> = new Array();
    let previousFiscalYear: number;
    let monthIndex: number = 0;
    let yearToDateBaselineActualEnergyUse: number = 0;
    let yearToDateModeledEnergyUse: number = 0;
    let yearToDateActualEnergyUse: number = 0;
    let yearToDateBaselineModeledEnergyUse: number = 0;
    let yearToDateAdjustedEnergyUse: number = 0;
    let summaryDataIndex: number = 0;
    while (baselineDate < endDate) {
      let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), account);
      if (previousFiscalYear == fiscalYear && summaryDataIndex != 0) {
        monthIndex++;
      } else {
        monthIndex = 0;
        yearToDateBaselineActualEnergyUse = 0;
        yearToDateModeledEnergyUse = 0;
        yearToDateActualEnergyUse = 0;
        yearToDateBaselineModeledEnergyUse = 0;
        yearToDateAdjustedEnergyUse = 0;
      }

      let currentMonthData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(summaryData => {
        let summaryDataDate: Date = new Date(summaryData.date);
        return summaryDataDate.getUTCMonth() == baselineDate.getUTCMonth() && summaryDataDate.getUTCFullYear() == baselineDate.getUTCFullYear();
      });

      let energyUse: number = _.sumBy(currentMonthData, 'energyUse');
      yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualEnergyUseData.push(energyUse);
      }
      let modeledEnergy: number = _.sumBy(currentMonthData, 'modeledEnergy');
      let baselineActualEnergyUse: number = baselineActualEnergyUseData[monthIndex];
      yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;

      yearToDateModeledEnergyUse = yearToDateModeledEnergyUse + modeledEnergy;

      if (fiscalYear == baselineYear) {
        baselineModeledEnergyUseData.push(modeledEnergy);
      }

      if (previousFiscalYear != fiscalYear) {
        previousFiscalYear = fiscalYear;
      }

      let baselineModeledEnergyUse: number = baselineModeledEnergyUseData[monthIndex];
      yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;
      let adjustedBaselineEnergyUse: number = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
      yearToDateAdjustedEnergyUse = yearToDateAdjustedEnergyUse + adjustedBaselineEnergyUse;
      let SEnPI: number = energyUse / adjustedBaselineEnergyUse;
      let savings: number = (baselineActualEnergyUse - baselineModeledEnergyUse) - (energyUse - modeledEnergy);
      let percentSavingsComparedToBaseline: number = savings / adjustedBaselineEnergyUse;
      let yearToDateSavings: number = (yearToDateBaselineActualEnergyUse - yearToDateBaselineModeledEnergyUse) - (yearToDateActualEnergyUse - yearToDateModeledEnergyUse);
      let yearToDatePercentSavings: number = (yearToDateSavings / yearToDateAdjustedEnergyUse);
      let rollingSavings: number = 0;
      let rolling12MonthImprovement: number = 0;
      if (summaryDataIndex >= 11) {
        let totalBaselineModeledEnergy: number = _.sum(baselineModeledEnergyUseData);
        let totalBaselineEnergy: number = _.sum(baselineActualEnergyUseData);
        let last11MonthsData: Array<MonthlyAnalysisSummaryData> = JSON.parse(JSON.stringify(analysisSummaryData));
        last11MonthsData = last11MonthsData.splice(summaryDataIndex - 11, summaryDataIndex);
        let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, 'energyUse') + energyUse;
        let total12MonthsModeledEnergy: number = _.sumBy(last11MonthsData, 'modeledEnergy') + modeledEnergy;
        rollingSavings = (totalBaselineEnergy - totalBaselineModeledEnergy) - (total12MonthsEnergyUse - total12MonthsModeledEnergy);
        let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjustedBaselineEnergyUse') + adjustedBaselineEnergyUse;
        rolling12MonthImprovement = rollingSavings / total12MonthsAdjusedBaseline;
      }


      analysisSummaryData.push({
        date: new Date(baselineDate),
        groupsSummaryData: currentMonthData,
        energyUse: energyUse,
        modeledEnergy: modeledEnergy,
        predictorUsage: [],
        fiscalYear: fiscalYear,
        group: undefined,
        adjustedBaselineEnergyUse: adjustedBaselineEnergyUse,
        SEnPI: SEnPI,
        savings: savings,
        percentSavingsComparedToBaseline: percentSavingsComparedToBaseline * 100,
        yearToDateSavings: yearToDateSavings,
        yearToDatePercentSavings: yearToDatePercentSavings * 100,
        rollingSavings: rollingSavings,
        rolling12MonthImprovement: rolling12MonthImprovement * 100
      })

      summaryDataIndex++;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }
    return analysisSummaryData;
  }
}
