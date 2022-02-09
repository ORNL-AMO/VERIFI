import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';

@Injectable({
  providedIn: 'root'
})
export class AbsoluteEnergyConsumptionService {

  constructor(private utilityMeterDbService: UtilityMeterdbService, private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  getMonthlyAbsoluteConsumptionGroupSummaries(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<MonthlyAnalysisSummaryData> {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroupId });
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
    });
    let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    //variables needed for calculations
    let previousFiscalYear: number = baselineYear;
    let yearToDateExpectedEnergyUse: number = 0;
    let yearToDateEnergyUse: number = 0;
    let baselineActualData: Array<number> = new Array();
    let baselineSEnPI: Array<number> = new Array();
    let summaryIndex: number = 0;
    let monthIndex: number = 0;
    let previousYearToDateSEnPI: number = 0;
    let expectedEnergy: number = 0;
    let monthlyAbsoluteSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    while (baselineDate < endDate) {
      //meter data for month
      let monthMeterData: Array<MonthlyData> = allMeterData.filter(data => {
        let meterDataDate: Date = new Date(data.date);
        return meterDataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && meterDataDate.getUTCMonth() == baselineDate.getUTCMonth();
      });
      //energy use for month
      let energyUse: number = _.sumBy(monthMeterData, 'energyUse');

      //calculate monthly savings
      let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility);
      let monthlySavings: number = 0;
      let rolling12MonthImprovement: number = 0;
      let rollingSEnPI: number = 1;
      let yearToDateSEnPI: number = 0;
      let yearToDateImprovement: number = 0;
      let yearToDateImprovementOverFiscalYear: number = 0;
      let monthlyIncrementalImprovement: number = 0;
      //skip incremental calcs for annual summary
      //just need energy calculations
      if (previousFiscalYear == fiscalYear && summaryIndex != 0) {
        monthIndex++;
      } else {
        monthIndex = 0;
      }

      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualData.push(energyUse);
      }
      expectedEnergy = baselineActualData[monthIndex];
      //if first year monthly savings = 0
      if (fiscalYear != baselineYear) {
        monthlySavings = energyUse - expectedEnergy;
      }
      //sum values for year to data
      if (previousFiscalYear == fiscalYear) {
        yearToDateEnergyUse = yearToDateEnergyUse + energyUse;
        yearToDateExpectedEnergyUse = yearToDateExpectedEnergyUse + expectedEnergy;
      } else {
        //rest fiscal year values on new year
        previousFiscalYear = fiscalYear;
        yearToDateEnergyUse = energyUse;
        yearToDateExpectedEnergyUse = expectedEnergy;
      }

      //year to date SEnPI calculation
      //calculate baseline expected and entered energy use
      //in same months as baseline year
      let baselineEnergy: number = 0;
      for (let i = 0; i <= monthIndex; i++) {
        baselineEnergy = baselineEnergy + baselineActualData[i];
      }
      if (fiscalYear > baselineYear) {
        //after regression model year
        yearToDateSEnPI = (yearToDateEnergyUse * baselineEnergy) / (yearToDateExpectedEnergyUse * baselineEnergy)
      } else {
        //regression model year or earlier
        yearToDateSEnPI = (yearToDateExpectedEnergyUse / yearToDateEnergyUse);
      }
      //track baseline SEnPI values
      if (fiscalYear == baselineYear) {
        baselineSEnPI.push(yearToDateSEnPI);
      }

      //calculate rolling SEnPI using previous 12 months of calculations
      if (summaryIndex > 10) {
        let last12MonthsEnergyTotal: number = energyUse;
        let last12MonthExpectedEnergyTotal: number = expectedEnergy;
        for (let i = (summaryIndex - 11); i < summaryIndex; i++) {
          last12MonthsEnergyTotal = last12MonthsEnergyTotal + monthlyAbsoluteSummaryData[i].totalEnergy;
          last12MonthExpectedEnergyTotal = last12MonthExpectedEnergyTotal + monthlyAbsoluteSummaryData[i].modeledEnergy;
        }
        if (fiscalYear > baselineYear) {
          let baselineEnergyTotal: number = _.sum(baselineActualData);
          rollingSEnPI = (last12MonthsEnergyTotal * baselineEnergyTotal) / (last12MonthExpectedEnergyTotal * baselineEnergyTotal)
        } else {
          rollingSEnPI = (last12MonthExpectedEnergyTotal / last12MonthsEnergyTotal);
        }
      }

      //calculate year to date improvement
      if (fiscalYear > baselineYear) {
        yearToDateImprovement = 1 - yearToDateSEnPI;
        monthlyIncrementalImprovement = yearToDateImprovement - previousYearToDateSEnPI;
        yearToDateImprovementOverFiscalYear = monthlyIncrementalImprovement;
        for (let i = 1; i <= monthIndex; i++) {
          yearToDateImprovementOverFiscalYear = yearToDateImprovementOverFiscalYear + (monthlyAbsoluteSummaryData[summaryIndex - i].monthlyIncrementalImprovement / 100)
        }
      }
      //calculate rolling 12 month improvement
      if (fiscalYear > baselineYear) {
        rolling12MonthImprovement = 1 - rollingSEnPI;
      }
      //add results
      monthlyAbsoluteSummaryData.push({
        totalEnergy: energyUse,
        modeledEnergy: expectedEnergy,
        date: new Date(baselineDate),
        group: selectedGroup,
        fiscalYear: fiscalYear,
        monthlySavings: monthlySavings,
        yearToDateImprovementOverBaseline: yearToDateImprovement * 100,
        yearToDateImprovementOverFiscalYear: yearToDateImprovementOverFiscalYear * 100,
        rollingYearImprovement: 0,
        yearToDateSEnPI: yearToDateSEnPI,
        rollingSEnPI: rollingSEnPI,
        monthlyIncrementalImprovement: monthlyIncrementalImprovement * 100,
        rolling12MonthImprovement: rolling12MonthImprovement * 100,
        predictorUsage: []
      });

      //set values for next iterations calculations
      previousYearToDateSEnPI = yearToDateImprovement;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
      summaryIndex++;
    }
    return monthlyAbsoluteSummaryData;
  }


  getAnnualAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualAnalysisSummary> {
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getMonthlyAbsoluteConsumptionGroupSummaries(selectedGroup, analysisItem, facility)
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    return this.analysisCalculationsHelperService.getAnnualAnalysisSummary(baselineYear, analysisItem, facility, monthlyAnalysisSummaryData);
  }

}

