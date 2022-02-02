import { Injectable } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import * as _ from 'lodash';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';

@Injectable({
  providedIn: 'root'
})
export class RegressionAnalysisService {

  constructor(private calendarizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private convertMeterDataService: ConvertMeterDataService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }


  getMonthlyRegressionSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, forAnnualSummaryCalculation?: boolean): MonthlyRegressionSummary {
    let predictorVariables: Array<PredictorData> = new Array();
    selectedGroup.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable)
      }
    });

    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();

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
    let regressionSummaryData: Array<RegressionSummaryData> = new Array();
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    //variables needed for calculations
    let previousEnergyUse: number = 0;
    let previousExpectedEnergyUse: number = 0;
    let previousMonthlySavings: number = 0;
    let previousFiscalYear: number = baselineYear;
    let yearToDateExpectedEnergyUse: number = 0;
    let yearToDateEnergyUse: number = 0;
    let baselineActualData: Array<number> = new Array();
    let baselineExpectedData: Array<number> = new Array();
    let baselineSEnPI: Array<number> = new Array();
    let summaryIndex: number = 0;
    let monthIndex: number = 0;
    let previousYearToDateSEnPI: number = 0;
    while (baselineDate < endDate) {
      //predictor data for month
      let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        let predictorDate: Date = new Date(predictorData.date);
        return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      });
      //meter data for month
      let monthMeterData: Array<MonthlyData> = allMeterData.filter(data => {
        let meterDataDate: Date = new Date(data.date);
        return meterDataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && meterDataDate.getUTCMonth() == baselineDate.getUTCMonth();
      });
      //energy use for month
      let energyUse: number = _.sumBy(monthMeterData, 'energyUse');
      //calculate predictor usage and modeledEnergy
      let predictorUsage: Array<number> = new Array();
      let modeledEnergy: number = 0;
      predictorVariables.forEach(variable => {
        let usageVal: number = 0;
        monthPredictorData.forEach(data => {
          let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
          usageVal = usageVal + predictorData.amount;
        });
        //modeleted energy = predictor usage * coefficient
        modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
        predictorUsage.push(usageVal);
      });
      modeledEnergy = modeledEnergy + selectedGroup.regressionConstant;
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
      if (!forAnnualSummaryCalculation) {
        //if first year monthly savings = 0
        if (fiscalYear != baselineYear) {
          if (fiscalYear > selectedGroup.regressionModelYear) {
            //after model year
            monthlySavings = energyUse - modeledEnergy;
          } else {
            //before model year
            monthlySavings = previousMonthlySavings + ((previousEnergyUse - previousExpectedEnergyUse) - (energyUse - modeledEnergy));
          }
        }
        //track year to date energy use
        if (fiscalYear == baselineYear) {
          baselineActualData.push(energyUse);
          baselineExpectedData.push(modeledEnergy);
        }
        //sum values for year to data
        if (previousFiscalYear == fiscalYear) {
          monthIndex++;
          yearToDateEnergyUse = yearToDateEnergyUse + energyUse;
          yearToDateExpectedEnergyUse = yearToDateExpectedEnergyUse + modeledEnergy;
        } else {
          //rest fiscal year values on new year
          monthIndex = 0;
          previousFiscalYear = fiscalYear;
          yearToDateEnergyUse = energyUse;
          yearToDateExpectedEnergyUse = modeledEnergy;
        }

        //year to date SEnPI calculation
        //calculate baseline expected and entered energy use
        //in same months as baseline year
        let baselineExpectedEnergy: number = 0;
        let baselineEnergy: number = 0;
        for (let i = 0; i <= monthIndex; i++) {
          baselineExpectedEnergy = baselineExpectedEnergy + baselineExpectedData[i];
          baselineEnergy = baselineEnergy + baselineActualData[i];
        }
        if (fiscalYear > selectedGroup.regressionModelYear) {
          //after regression model year
          yearToDateSEnPI = (yearToDateEnergyUse * baselineExpectedEnergy) / (yearToDateExpectedEnergyUse * baselineEnergy)
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
          let last12MonthExpectedEnergyTotal: number = modeledEnergy;
          for (let i = (summaryIndex - 11); i < summaryIndex; i++) {
            last12MonthsEnergyTotal = last12MonthsEnergyTotal + regressionSummaryData[i].totalEnergy;
            last12MonthExpectedEnergyTotal = last12MonthExpectedEnergyTotal + regressionSummaryData[i].modeledEnergy;
          }
          if (fiscalYear > selectedGroup.regressionModelYear) {
            let baselineEnergyTotal: number = _.sum(baselineActualData);
            let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
            rollingSEnPI = (last12MonthsEnergyTotal * baselineExpectedEnergyTotal) / (last12MonthExpectedEnergyTotal * baselineEnergyTotal)
          } else {
            rollingSEnPI = (last12MonthExpectedEnergyTotal / last12MonthsEnergyTotal);
          }
        }

        //calculate year to date improvement
        if (fiscalYear > baselineYear) {
          if (fiscalYear > selectedGroup.regressionModelYear) {
            yearToDateImprovement = 1 - yearToDateSEnPI;
          } else {
            yearToDateImprovement = (1 - baselineSEnPI[monthIndex]) - (1 - yearToDateSEnPI);
          }
          monthlyIncrementalImprovement = yearToDateImprovement - previousYearToDateSEnPI;
          yearToDateImprovementOverFiscalYear = monthlyIncrementalImprovement;
          for (let i = 1; i <= monthIndex; i++) {
            yearToDateImprovementOverFiscalYear = yearToDateImprovementOverFiscalYear + (regressionSummaryData[summaryIndex - i].monthlyIncrementalImprovement / 100)
          }
        }
        //calculate rolling 12 month improvement
        if (fiscalYear > baselineYear) {
          if (fiscalYear > selectedGroup.regressionModelYear) {
            rolling12MonthImprovement = 1 - rollingSEnPI;
          } else {
            let baselineEnergyTotal: number = _.sum(baselineActualData);
            let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
            let baselineAnnualSEnPI: number = baselineExpectedEnergyTotal / baselineEnergyTotal;
            rolling12MonthImprovement = (1 - baselineAnnualSEnPI) - (1 - rollingSEnPI);
          }
        }
      }
      //add results
      regressionSummaryData.push({
        totalEnergy: energyUse,
        predictorUsage: predictorUsage,
        modeledEnergy: modeledEnergy,
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
        rolling12MonthImprovement: rolling12MonthImprovement * 100
      });

      //set values for next iterations calculations
      previousYearToDateSEnPI = yearToDateImprovement;
      previousEnergyUse = energyUse;
      previousExpectedEnergyUse = modeledEnergy;
      previousMonthlySavings = monthlySavings;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
      summaryIndex++;
    }

    return {
      predictorVariables: predictorVariables,
      modelYear: undefined,
      regressionSummaryData: regressionSummaryData
    }
  }

  getAnnualRegressionSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualRegressionSummary> {
    let annualRegressionSummary: Array<AnnualRegressionSummary> = new Array();

    let monthlyRegressionSummary: MonthlyRegressionSummary = this.getMonthlyRegressionSummary(selectedGroup, analysisItem, facility, true)


    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let previousYearSavings: number = 0;
    let baselineEnergyUse: number;
    let baselineModeledEnergy: number;
    let baselineSEnPI: number;
    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      let summaryYearData: Array<RegressionSummaryData> = monthlyRegressionSummary.regressionSummaryData.filter(data => { return data.fiscalYear == summaryYear });
      let energyUse: number = _.sumBy(summaryYearData, 'totalEnergy');
      let modeledEnergyUse: number = _.sumBy(summaryYearData, 'modeledEnergy');
      let SEnPI: number;
      let cumulativeSavings: number = 0;
      let annualSavings: number = 0;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = energyUse;
        baselineModeledEnergy = modeledEnergyUse;
      }

      if (summaryYear > selectedGroup.regressionModelYear) {
        SEnPI = (energyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
      } else {
        SEnPI = modeledEnergyUse / energyUse;
      }

      if (summaryYear == baselineYear) {
        baselineSEnPI = SEnPI;
      } else if (summaryYear > selectedGroup.regressionModelYear) {
        cumulativeSavings = 1 - SEnPI;
        annualSavings = cumulativeSavings - previousYearSavings;
      } else {
        cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
        annualSavings = cumulativeSavings - previousYearSavings;
      }

      annualRegressionSummary.push({
        year: summaryYear,
        energyUse: energyUse,
        modeledEnergyUse: modeledEnergyUse,
        SEnPI: SEnPI,
        cumulativeSavings: cumulativeSavings * 100,
        annualSavings: annualSavings * 100
      })
      previousYearSavings = cumulativeSavings;
    }
    return annualRegressionSummary;
  }
}

export interface MonthlyRegressionSummary {
  predictorVariables: Array<PredictorData>,
  modelYear: number,
  regressionSummaryData: Array<RegressionSummaryData>
}

export interface RegressionSummaryData {
  totalEnergy: number,
  predictorUsage: Array<number>,
  modeledEnergy: number,
  date: Date,
  monthlySavings: number,
  yearToDateImprovementOverBaseline: number,
  yearToDateImprovementOverFiscalYear: number,
  rollingYearImprovement: number,
  group: AnalysisGroup,
  fiscalYear: number,
  yearToDateSEnPI: number,
  rollingSEnPI: number,
  monthlyIncrementalImprovement: number,
  rolling12MonthImprovement: number
}


export interface AnnualRegressionSummary {
  year: number,
  energyUse: number,
  modeledEnergyUse: number,
  SEnPI: number,
  cumulativeSavings: number,
  annualSavings: number
}