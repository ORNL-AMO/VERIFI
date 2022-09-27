import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem } from "src/app/models/idb";


export class MonthlyAnalysis {

    accountAnalysisItem: IdbAccountAnalysisItem;
    account: IdbAccount;
    calanderizedMeters: Array<CalanderizedMeter>;
    allAccountAnalysisDbItems: Array<IdbAnalysisItem>
    constructor(accountAnalysisItem: IdbAccountAnalysisItem, account: IdbAccount, calanderizedMeters: Array<CalanderizedMeter>) {
        this.accountAnalysisItem = accountAnalysisItem;
        this.account = account;
        this.calanderizedMeters = calanderizedMeters;
        console.log('initialized');
    }

    calculateMonthlyAnalysis(): Array<MonthlyAnalysisSummaryData> {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getMonthlyStartAndEndDate();
        let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
        let endDate: Date = monthlyStartAndEndDate.endDate;
    
        let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    
        // let allAccountAnalysisDbItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        // let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        // let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
        // accountAnalysisItem.facilityAnalysisItems.forEach(item => {
        //   if (item.analysisItemId != undefined) {
        //     let analysisItem: IdbAnalysisItem = allAccountAnalysisDbItems.find(dbItem => { return dbItem.guid == item.analysisItemId });
        //     //update items with account options
        //     analysisItem.energyUnit = accountAnalysisItem.energyUnit;
        //     let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == item.facilityId });
        //     let facilityItemSummary: Array<MonthlyAnalysisSummaryData> = this.facilityAnalysisCalculationsService.calculateMonthlyFacilityAnalysis(analysisItem, facility, calanderizedMeters);
        //     monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.concat(facilityItemSummary);
        //   }
        // })
    
        // let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, account);
        // let annualMeterDataUsage: Array<{ year: number, usage: number }> = new Array();
        // for (let year = baselineYear + 1; year <= endDate.getUTCFullYear(); year++) {
        //   let yearMeterData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(data => { return data.fiscalYear == year });
        //   let totalUsage: number = _.sumBy(yearMeterData, 'energyUse');
        //   annualMeterDataUsage.push({ year: year, usage: totalUsage });
        // }
    
        // let baselineActualEnergyUseData: Array<number> = new Array();
        // let baselineModeledEnergyUseData: Array<number> = new Array();
        // let previousFiscalYear: number;
        // let monthIndex: number = 0;
        // let yearToDateBaselineActualEnergyUse: number = 0;
        // let yearToDateModeledEnergyUse: number = 0;
        // let yearToDateActualEnergyUse: number = 0;
        // let yearToDateBaselineModeledEnergyUse: number = 0;
        // let yearToDateAdjustedEnergyUse: number = 0;
        // let summaryDataIndex: number = 0;
        // while (baselineDate < endDate) {
        //   let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), account);
        //   if (previousFiscalYear == fiscalYear && summaryDataIndex != 0) {
        //     monthIndex++;
        //   } else {
        //     monthIndex = 0;
        //     yearToDateBaselineActualEnergyUse = 0;
        //     yearToDateModeledEnergyUse = 0;
        //     yearToDateActualEnergyUse = 0;
        //     yearToDateBaselineModeledEnergyUse = 0;
        //     yearToDateAdjustedEnergyUse = 0;
        //   }
    
        //   let currentMonthData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(summaryData => {
        //     let summaryDataDate: Date = new Date(summaryData.date);
        //     return summaryDataDate.getUTCMonth() == baselineDate.getUTCMonth() && summaryDataDate.getUTCFullYear() == baselineDate.getUTCFullYear();
        //   });
    
        //   let energyUse: number = _.sumBy(currentMonthData, 'energyUse');
        //   yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
        //   //track year to date energy use
        //   if (fiscalYear == baselineYear) {
        //     baselineActualEnergyUseData.push(energyUse);
        //   }
        //   let modeledEnergy: number = _.sumBy(currentMonthData, 'modeledEnergy');
        //   let baselineActualEnergyUse: number = baselineActualEnergyUseData[monthIndex];
        //   yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
    
        //   yearToDateModeledEnergyUse = yearToDateModeledEnergyUse + modeledEnergy;
    
        //   let annualEnergyUse: number = 0;
        //   if (fiscalYear == baselineYear) {
        //     baselineModeledEnergyUseData.push(modeledEnergy);
        //   } else {
        //     annualEnergyUse = annualMeterDataUsage.find(annualUsage => { return annualUsage.year == baselineDate.getUTCFullYear() }).usage;
        //   }
    
        //   if (previousFiscalYear != fiscalYear) {
        //     previousFiscalYear = fiscalYear;
        //   }
    
    
        //   let baselineAdjustmentForOther: number = 0;
        //   let baselineModeledEnergyUse: number = baselineModeledEnergyUseData[monthIndex];
        //   yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;
        //   let adjustedForNormalization: number = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
    
        //   if (accountAnalysisItem.hasBaselineAdjustement && fiscalYear != baselineYear) {
        //     let yearAdjustment: { year: number, amount: number } = accountAnalysisItem.baselineAdjustments.find(bAdjustement => { return bAdjustement.year == baselineDate.getUTCFullYear(); })
        //     if (yearAdjustment.amount) {
        //       baselineAdjustmentForOther = (energyUse / annualEnergyUse) * yearAdjustment.amount;
        //     }
        //   }
        //   let currentMonthAdjustementForOther: number = _.sumBy(currentMonthData, 'baselineAdjustmentForOther');
        //   baselineAdjustmentForOther = baselineAdjustmentForOther + currentMonthAdjustementForOther;
        //   let baselineAdjustment: number = 0;
        //   let baselineAdjustmentForNormalization: number = 0;
        //   let adjusted: number = adjustedForNormalization + baselineAdjustmentForOther;
        //   yearToDateAdjustedEnergyUse = yearToDateAdjustedEnergyUse + adjusted;
    
    
    
        //   let SEnPI: number = energyUse / adjusted;
        //   let savings: number = adjusted - energyUse;
        //   let percentSavingsComparedToBaseline: number = savings / adjusted;
        //   let yearToDateSavings: number = (yearToDateBaselineActualEnergyUse - yearToDateBaselineModeledEnergyUse) - (yearToDateActualEnergyUse - yearToDateModeledEnergyUse);
        //   let yearToDatePercentSavings: number = (yearToDateSavings / yearToDateAdjustedEnergyUse);
        //   let rollingSavings: number = 0;
        //   let rolling12MonthImprovement: number = 0;
        //   if (summaryDataIndex >= 11) {
        //     let totalBaselineModeledEnergy: number = _.sum(baselineModeledEnergyUseData);
        //     let totalBaselineEnergy: number = _.sum(baselineActualEnergyUseData);
        //     let last11MonthsData: Array<MonthlyAnalysisSummaryData> = JSON.parse(JSON.stringify(analysisSummaryData));
        //     last11MonthsData = last11MonthsData.splice(summaryDataIndex - 11, summaryDataIndex);
        //     let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, 'energyUse') + energyUse;
        //     let total12MonthsModeledEnergy: number = _.sumBy(last11MonthsData, 'modeledEnergy') + modeledEnergy;
        //     rollingSavings = (totalBaselineEnergy - totalBaselineModeledEnergy) - (total12MonthsEnergyUse - total12MonthsModeledEnergy);
        //     let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjusted') + adjusted;
        //     rolling12MonthImprovement = rollingSavings / total12MonthsAdjusedBaseline;
    
        //     baselineAdjustmentForNormalization = adjustedForNormalization - baselineActualEnergyUse;
        //     baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
        //   }
    
    
        //   analysisSummaryData.push({
        //     date: new Date(baselineDate),
        //     groupsSummaryData: currentMonthData,
        //     energyUse: energyUse,
        //     modeledEnergy: modeledEnergy,
        //     predictorUsage: [],
        //     fiscalYear: fiscalYear,
        //     group: undefined,
        //     adjustedForNormalization: adjustedForNormalization,
        //     adjusted: adjusted,
        //     baselineAdjustmentForNormalization: baselineAdjustmentForNormalization,
        //     baselineAdjustmentForOther: baselineAdjustmentForOther,
        //     baselineAdjustment: baselineAdjustment,
        //     SEnPI: this.analysisCalculationsHelperService.checkValue(SEnPI),
        //     savings: this.analysisCalculationsHelperService.checkValue(savings),
        //     percentSavingsComparedToBaseline: this.analysisCalculationsHelperService.checkValue(percentSavingsComparedToBaseline) * 100,
        //     yearToDateSavings: this.analysisCalculationsHelperService.checkValue(yearToDateSavings),
        //     yearToDatePercentSavings: this.analysisCalculationsHelperService.checkValue(yearToDatePercentSavings) * 100,
        //     rollingSavings: this.analysisCalculationsHelperService.checkValue(rollingSavings),
        //     rolling12MonthImprovement: this.analysisCalculationsHelperService.checkValue(rolling12MonthImprovement) * 100,
        //   })
    
        //   summaryDataIndex++;
        //   let currentMonth: number = baselineDate.getUTCMonth()
        //   let nextMonth: number = currentMonth + 1;
        //   baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
        // }
        return analysisSummaryData;


        return;
    }


    getMonthlyStartAndEndDate(): { baselineDate: Date, endDate: Date } {
        let baselineDate: Date;
        let endDate: Date;
        if (this.account.fiscalYear == 'calendarYear') {
          baselineDate = new Date(this.account.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
          endDate = new Date(this.accountAnalysisItem.reportYear + 1, 0, 1);
        } else {
          if (this.account.fiscalYearCalendarEnd) {
            baselineDate = new Date(this.account.sustainabilityQuestions.energyReductionBaselineYear - 1, this.account.fiscalYearMonth);
            endDate = new Date(this.accountAnalysisItem.reportYear, this.account.fiscalYearMonth);
          } else {
            baselineDate = new Date(this.account.sustainabilityQuestions.energyReductionBaselineYear, this.account.fiscalYearMonth);
            endDate = new Date(this.accountAnalysisItem.reportYear + 1, this.account.fiscalYearMonth);
          }
        }
        return {
          baselineDate: baselineDate,
          endDate: endDate
        }
      }
}