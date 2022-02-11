import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsHelperService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService) { }

  getMonthlyStartAndEndDate(facility: IdbFacility, analysisItem: IdbAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facility.fiscalYear == 'calendarYear') {
      baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
      endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
      if (facility.fiscalYearCalendarEnd) {
        baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear - 1, facility.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear, facility.fiscalYearMonth);
      } else {
        baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear, facility.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear + 1, facility.fiscalYearMonth);
      }
    }
    return {
      baselineDate: baselineDate,
      endDate: endDate
    }
  }

  getFiscalYear(date: Date, facility: IdbFacility): number {
    if (facility.fiscalYear == 'calendarYear') {
      return date.getUTCFullYear();
    } else {
      if (facility.fiscalYearCalendarEnd) {
        if (date.getUTCMonth() >= facility.fiscalYearMonth) {
          return date.getUTCFullYear() + 1;
        } else {
          return date.getUTCFullYear();
        }
      } else {
        if (date.getUTCMonth() >= facility.fiscalYearMonth) {
          return date.getUTCFullYear();
        } else {
          return date.getUTCFullYear() - 1;
        }
      }
    }
  }

  getYearOptions(): Array<number> {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(accountMeterData, (data) => { return new Date(data.readDate) });
    let firstBill: IdbUtilityMeterData = orderedMeterData[0];
    let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
    let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
    let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
    let yearOptions: Array<number> = new Array();
    for (let i = yearStart; i <= yearEnd; i++) {
      yearOptions.push(i);
    }
    return yearOptions;
  }

  filterYearPredictorData(predictorData: Array<IdbPredictorEntry>, year: number, facility: IdbFacility): Array<IdbPredictorEntry> {
    if (facility.fiscalYear == 'calendarYear') {
      return predictorData.filter(predictorData => {
        return new Date(predictorData.date).getUTCFullYear() == year;
      });
    } else {
      let startDate: Date = new Date(year, facility.fiscalYearMonth, 1)
      let endDate: Date = new Date(year + 1, facility.fiscalYearMonth, 1)
      return predictorData.filter(predictorDataItem => {
        let predictorItemDate: Date = new Date(predictorDataItem.date);
        return predictorItemDate >= startDate && predictorItemDate < endDate;
      });
    }
  }

  filterYearMeterData(meterData: Array<MonthlyData>, year: number, facility: IdbFacility): Array<MonthlyData> {
    if (facility.fiscalYear == 'calendarYear') {
      return meterData.filter(meterDataItem => {
        return new Date(meterDataItem.date).getUTCFullYear() == year;
      });
    } else {
      let startDate: Date = new Date(year, facility.fiscalYearMonth, 1)
      let endDate: Date = new Date(year + 1, facility.fiscalYearMonth, 1)
      return meterData.filter(meterDataItem => {
        let meterItemDate: Date = new Date(meterDataItem.date);
        return meterItemDate >= startDate && meterItemDate < endDate;
      });
    }
  }


  getAnnualAnalysisSummary(analysisItem: IdbAnalysisItem, facility: IdbFacility, selectedGroup: AnalysisGroup): Array<AnnualAnalysisSummary> {
    let modelYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    if(selectedGroup.analysisType == 'regression'){
      modelYear = selectedGroup.regressionModelYear;
    }
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getMonthlyAnalysisSummary(selectedGroup, analysisItem, facility).monthlyAnalysisSummaryData;    
    
    let annualRegressionSummary: Array<AnnualAnalysisSummary> = new Array();
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let previousYearSavings: number = 0;
    let previousYearEnergyUse: number = 0;
    let previousYearModeledEnergyUse: number = 0;
    let totalEnergySavings: number = 0;
    let totalModeledEnergySavings: number = 0;
    let baselineEnergyUse: number;
    let baselineModeledEnergy: number;
    let baselineSEnPI: number;
    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(data => { return data.fiscalYear == summaryYear });
      let energyUse: number = _.sumBy(summaryYearData, 'totalEnergy');
      let modeledEnergyUse: number = _.sumBy(summaryYearData, 'modeledEnergy');
      let SEnPI: number;
      let cumulativeSavings: number = 0;
      let annualSavings: number = 0;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = energyUse;
        baselineModeledEnergy = modeledEnergyUse;
      }

      if (summaryYear > modelYear) {
        SEnPI = (energyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
      } else {
        SEnPI = modeledEnergyUse / energyUse;
      }
      if (summaryYear == baselineYear) {
        baselineSEnPI = SEnPI;
        previousYearEnergyUse = energyUse;
        previousYearModeledEnergyUse = modeledEnergyUse;
      } else if (summaryYear > modelYear) {
        cumulativeSavings = 1 - SEnPI;
        annualSavings = cumulativeSavings - previousYearSavings;
      } else {
        cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
        annualSavings = cumulativeSavings - previousYearSavings;
      }

      let annualEnergySavings: number = previousYearEnergyUse - energyUse;
      let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergyUse;
      totalEnergySavings = totalEnergySavings + annualEnergySavings;
      totalModeledEnergySavings = totalModeledEnergySavings + annualModeledEnergySavings;
      annualRegressionSummary.push({
        year: summaryYear,
        energyUse: energyUse,
        annualEnergySavings: annualEnergySavings,
        totalEnergySavings: totalEnergySavings,
        annualModeledEnergySavings: annualModeledEnergySavings,
        totalModeledEnergySavings: totalModeledEnergySavings,
        modeledEnergyUse: modeledEnergyUse,
        SEnPI: SEnPI,
        cumulativeSavings: cumulativeSavings * 100,
        annualSavings: annualSavings * 100,
        energyIntensity: 0,
        totalProduction: 0,
        annualProductionChange: 0,
        totalProductionChange: 0,
        totalEnergyIntensityChange: 0,
        annualEnergyIntensityChange: 0,
      })
      previousYearSavings = cumulativeSavings;
      previousYearEnergyUse = energyUse;
      previousYearModeledEnergyUse = modeledEnergyUse;
    }
    return annualRegressionSummary;
  }


  getMonthlyAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): MonthlyAnalysisSummary {
    let predictorVariables: Array<PredictorData> = new Array();
    let productionVariables: Array<PredictorData> = new Array();
    if(selectedGroup.analysisType != 'absoluteEnergyConsumption'){
      selectedGroup.predictorVariables.forEach(variable => {
        if (variable.productionInAnalysis) {
          predictorVariables.push(variable);
          if (variable.production) {
            productionVariables.push(variable);
          }
        }
      });
    }
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

    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;
    let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    let baselineYear: number = this.getFiscalYear(baselineDate, facility);
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
    let modelYear: number;
    let baselineEnergyIntensity: number;
    let baselineYearPredictorData: Array<IdbPredictorEntry> = this.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
    let baselineMeterData: Array<MonthlyData> = this.filterYearMeterData(allMeterData, baselineYear, facility);
    let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
    let totalPredictorUsage: number = this.getPredictorUsage(predictorVariables, baselineYearPredictorData);

    let baselineYearEnergyIntensity: number = totalBaselineYearEnergy / totalPredictorUsage;
    while (baselineDate < endDate) {
      let fiscalYear: number = this.getFiscalYear(new Date(baselineDate), facility);
      if (previousFiscalYear == fiscalYear && summaryIndex != 0) {
        monthIndex++;
      } else {
        monthIndex = 0;
      }
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
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualData.push(energyUse);
      }
      //calculate predictor usage and modeledEnergy
      let predictorUsage: Array<number> = new Array();
      let productionUsage: Array<number> = new Array();
      let modeledEnergy: number = 0;
      if (selectedGroup.analysisType != 'absoluteEnergyConsumption') {
        predictorVariables.forEach(variable => {
          let usageVal: number = 0;
          monthPredictorData.forEach(data => {
            let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
            usageVal = usageVal + predictorData.amount;
          });
          //modeleted energy = predictor usage * coefficient
          modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
          predictorUsage.push(usageVal);
          if(variable.production){
            productionUsage.push(usageVal);
          }
        });
      }

      let totalProduction: number = _.sum(productionUsage);
      let energyIntensity: number = energyUse / totalProduction;
      if (fiscalYear == baselineYear) {
        baselineEnergyIntensity = energyIntensity;
      }

      if (selectedGroup.analysisType == 'regression') {
        modelYear = selectedGroup.regressionModelYear;
        predictorVariables.forEach(variable => {
          let usageVal: number = 0;
          monthPredictorData.forEach(data => {
            let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
            usageVal = usageVal + predictorData.amount;
          });
          //modeleted energy = predictor usage * coefficient
          modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
        });
        modeledEnergy = modeledEnergy + selectedGroup.regressionConstant;
      } else if (selectedGroup.analysisType == 'absoluteEnergyConsumption') {
        modelYear = baselineYear;
        modeledEnergy = baselineActualData[monthIndex];
      } else if (selectedGroup.analysisType == 'energyIntensity') {
        modelYear = baselineYear;
        modeledEnergy = totalProduction * baselineEnergyIntensity;
      } else if (selectedGroup.analysisType == 'modifiedEnergyIntensity') {
        modelYear = baselineYear;
        let baseLoad: number = selectedGroup.averagePercentBaseload / 100;
        modeledEnergy = energyUse / (1 - ((1 - baseLoad) * (1 - ((energyUse / totalProduction) / baselineYearEnergyIntensity)) + (baseLoad * (1 - (energyUse / baselineActualData[monthIndex])))));
      }
      //calculate monthly savings
      let monthlySavings: number = 0;
      let rolling12MonthImprovement: number = 0;
      let rollingSEnPI: number = 1;
      let yearToDateSEnPI: number = 0;
      let yearToDateImprovement: number = 0;
      let yearToDateImprovementOverFiscalYear: number = 0;
      let monthlyIncrementalImprovement: number = 0;
      //skip incremental calcs for annual summary
      //just need energy calculations
      //if first year monthly savings = 0
      if (fiscalYear != baselineYear) {
        if (fiscalYear > modelYear) {
          //after model year
          monthlySavings = energyUse - modeledEnergy;
        } else {
          //before model year
          monthlySavings = previousMonthlySavings + ((previousEnergyUse - previousExpectedEnergyUse) - (energyUse - modeledEnergy));
        }
      }
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineExpectedData.push(modeledEnergy);
      }
      //sum values for year to data
      if (previousFiscalYear == fiscalYear) {
        yearToDateEnergyUse = yearToDateEnergyUse + energyUse;
        yearToDateExpectedEnergyUse = yearToDateExpectedEnergyUse + modeledEnergy;
      } else {
        //rest fiscal year values on new year
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
      if (fiscalYear > modelYear) {
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
          last12MonthsEnergyTotal = last12MonthsEnergyTotal + analysisSummaryData[i].totalEnergy;
          last12MonthExpectedEnergyTotal = last12MonthExpectedEnergyTotal + analysisSummaryData[i].modeledEnergy;
        }
        if (fiscalYear > modelYear) {
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
          yearToDateImprovementOverFiscalYear = yearToDateImprovementOverFiscalYear + (analysisSummaryData[summaryIndex - i].monthlyIncrementalImprovement / 100)
        }
      }
      //calculate rolling 12 month improvement
      if (fiscalYear > baselineYear) {
        if (fiscalYear > modelYear) {
          rolling12MonthImprovement = 1 - rollingSEnPI;
        } else {
          let baselineEnergyTotal: number = _.sum(baselineActualData);
          let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
          let baselineAnnualSEnPI: number = baselineExpectedEnergyTotal / baselineEnergyTotal;
          rolling12MonthImprovement = (1 - baselineAnnualSEnPI) - (1 - rollingSEnPI);
        }
      }
      
      //add results
      analysisSummaryData.push({
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
        rolling12MonthImprovement: rolling12MonthImprovement * 100,
        energyIntensity: energyIntensity
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
      monthlyAnalysisSummaryData: analysisSummaryData
    }
  }


  getPredictorUsage(predictorVariables: Array<PredictorData>, predictorData: Array<IdbPredictorEntry>): number {
    let totalPredictorUsage: number = 0;
    predictorVariables.forEach(variable => {
      predictorData.forEach(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        totalPredictorUsage = totalPredictorUsage + predictorData.amount;
      });
    });
    return totalPredictorUsage;
  }
}
