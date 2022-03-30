import { Injectable } from '@angular/core';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, FacilityMonthlyAnalysisSummaryData, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsService {

  constructor(private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  // getAnnualAnalysisSummary(analysisItem: IdbAnalysisItem, facility: IdbFacility, selectedGroup: AnalysisGroup, monthlyAnalysisSummaryData?: Array<MonthlyAnalysisSummaryData>): Array<AnnualAnalysisSummary> {
  //   if (selectedGroup.analysisType == 'modifiedEnergyIntensity') {
  //     return this.getMEIAnnualAnalysisSummary(selectedGroup, analysisItem, facility);
  //   } else {

  //     let modelYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
  //     if (selectedGroup.analysisType == 'regression') {
  //       modelYear = selectedGroup.regressionModelYear;
  //     }
  //     if (!monthlyAnalysisSummaryData) {
  //       monthlyAnalysisSummaryData = this.getMonthlyAnalysisSummary(selectedGroup, analysisItem, facility).monthlyAnalysisSummaryData;
  //     }

  //     let annualAnalysisSummary: Array<AnnualAnalysisSummary> = new Array();
  //     let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
  //     let reportYear: number = analysisItem.reportYear;
  //     if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
  //       baselineYear = baselineYear - 1;
  //       reportYear = reportYear - 1;
  //     }
  //     let previousYearSavings: number = 0;
  //     let previousYearEnergyUse: number = 0;
  //     let previousYearModeledEnergyUse: number = 0;
  //     let totalEnergySavings: number = 0;
  //     let totalModeledEnergySavings: number = 0;
  //     let baselineEnergyUse: number;
  //     let baselineModeledEnergy: number;
  //     let baselineSEnPI: number;
  //     for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
  //       let summaryYearData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(data => { return data.fiscalYear == summaryYear });
  //       let energyUse: number = _.sumBy(summaryYearData, 'totalEnergy');
  //       let modeledEnergyUse: number = _.sumBy(summaryYearData, 'modeledEnergy');
  //       let SEnPI: number;
  //       let cumulativeSavings: number = 0;
  //       let annualSavings: number = 0;

  //       if (summaryYear == baselineYear) {
  //         baselineEnergyUse = energyUse;
  //         baselineModeledEnergy = modeledEnergyUse;
  //       }

  //       if (summaryYear > modelYear) {
  //         SEnPI = (energyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
  //       } else {
  //         SEnPI = modeledEnergyUse / energyUse;
  //       }
  //       if (summaryYear == baselineYear) {
  //         baselineSEnPI = SEnPI;
  //         previousYearEnergyUse = energyUse;
  //         previousYearModeledEnergyUse = modeledEnergyUse;
  //       } else if (summaryYear > modelYear) {
  //         cumulativeSavings = 1 - SEnPI;
  //         annualSavings = cumulativeSavings - previousYearSavings;
  //       } else {
  //         cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
  //         annualSavings = cumulativeSavings - previousYearSavings;
  //       }

  //       let annualEnergySavings: number = previousYearEnergyUse - energyUse;
  //       let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergyUse;
  //       totalEnergySavings = totalEnergySavings + annualEnergySavings;
  //       totalModeledEnergySavings = totalModeledEnergySavings + annualModeledEnergySavings;
  //       annualAnalysisSummary.push({
  //         year: summaryYear,
  //         energyUse: energyUse,
  //         annualEnergySavings: annualEnergySavings,
  //         totalEnergySavings: totalEnergySavings,
  //         annualModeledEnergySavings: annualModeledEnergySavings,
  //         totalModeledEnergySavings: totalModeledEnergySavings,
  //         modeledEnergyUse: modeledEnergyUse,
  //         SEnPI: SEnPI,
  //         cumulativeSavings: cumulativeSavings * 100,
  //         annualSavings: annualSavings * 100,
  //         energyIntensity: 0,
  //         totalProduction: 0,
  //         annualProductionChange: 0,
  //         totalProductionChange: 0,
  //         totalEnergyIntensityChange: 0,
  //         annualEnergyIntensityChange: 0,
  //       })
  //       previousYearSavings = cumulativeSavings;
  //       previousYearEnergyUse = energyUse;
  //       previousYearModeledEnergyUse = modeledEnergyUse;
  //     }
  //     return annualAnalysisSummary;
  //   }
  // }


  // getMonthlyAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): MonthlyAnalysisSummary {
  //   let predictorVariables: Array<PredictorData> = new Array();
  //   let productionVariables: Array<PredictorData> = new Array();
  //   if (selectedGroup.analysisType != 'absoluteEnergyConsumption') {
  //     selectedGroup.predictorVariables.forEach(variable => {
  //       if (variable.productionInAnalysis) {
  //         predictorVariables.push(variable);
  //         if (variable.production) {
  //           productionVariables.push(variable);
  //         }
  //       }
  //     });
  //   }
  //   let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();

  //   let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
  //   let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroupId });
  //   let calanderizationOptions: CalanderizationOptions = {
  //     energyIsSource: analysisItem.energyIsSource
  //   }
  //   let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
  //   calanderizedMeterData.forEach(calanderizedMeter => {
  //     calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
  //   });
  //   let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

  //   let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
  //   let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
  //   let endDate: Date = monthlyStartAndEndDate.endDate;
  //   let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
  //   let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
  //   //variables needed for calculations
  //   let previousEnergyUse: number = 0;
  //   let previousExpectedEnergyUse: number = 0;
  //   let previousMonthlySavings: number = 0;
  //   let previousFiscalYear: number = baselineYear;
  //   let yearToDateExpectedEnergyUse: number = 0;
  //   let yearToDateEnergyUse: number = 0;
  //   let baselineActualData: Array<number> = new Array();
  //   let baselineExpectedData: Array<number> = new Array();
  //   let baselineSEnPI: Array<number> = new Array();
  //   let summaryIndex: number = 0;
  //   let monthIndex: number = 0;
  //   let previousYearToDateSEnPI: number = 0;
  //   let modelYear: number;
  //   let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
  //   let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
  //   let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
  //   let totalPredictorUsage: number = this.analysisCalculationsHelperService.getPredictorUsage(predictorVariables, baselineYearPredictorData);

  //   let baselineYearEnergyIntensity: number = totalBaselineYearEnergy / totalPredictorUsage;
  //   while (baselineDate < endDate) {
  //     let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility);
  //     if (previousFiscalYear == fiscalYear && summaryIndex != 0) {
  //       monthIndex++;
  //     } else {
  //       monthIndex = 0;
  //     }
  //     //predictor data for month
  //     let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
  //       let predictorDate: Date = new Date(predictorData.date);
  //       return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
  //     });
  //     //meter data for month
  //     let monthMeterData: Array<MonthlyData> = allMeterData.filter(data => {
  //       let meterDataDate: Date = new Date(data.date);
  //       return meterDataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && meterDataDate.getUTCMonth() == baselineDate.getUTCMonth();
  //     });
  //     //energy use for month
  //     let energyUse: number = _.sumBy(monthMeterData, 'energyUse');
  //     //track year to date energy use
  //     if (fiscalYear == baselineYear) {
  //       baselineActualData.push(energyUse);
  //     }
  //     //calculate predictor usage and modeledEnergy
  //     let predictorUsage: Array<number> = new Array();
  //     let productionUsage: Array<number> = new Array();
  //     let modeledEnergy: number = 0;
  //     if (selectedGroup.analysisType != 'absoluteEnergyConsumption') {
  //       predictorVariables.forEach(variable => {
  //         let usageVal: number = 0;
  //         monthPredictorData.forEach(data => {
  //           let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
  //           usageVal = usageVal + predictorData.amount;
  //         });
  //         predictorUsage.push(usageVal);
  //         if (variable.production) {
  //           productionUsage.push(usageVal);
  //         }
  //       });
  //     }

  //     let totalProduction: number = _.sum(productionUsage);
  //     let energyIntensity: number = energyUse / totalProduction;

  //     if (selectedGroup.analysisType == 'regression') {
  //       modelYear = selectedGroup.regressionModelYear;
  //       predictorVariables.forEach(variable => {
  //         let usageVal: number = 0;
  //         monthPredictorData.forEach(data => {
  //           let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
  //           usageVal = usageVal + predictorData.amount;
  //         });
  //         //modeleted energy = predictor usage * coefficient
  //         modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
  //       });
  //       modeledEnergy = modeledEnergy + selectedGroup.regressionConstant;
  //     } else if (selectedGroup.analysisType == 'absoluteEnergyConsumption') {
  //       modelYear = baselineYear;
  //       modeledEnergy = baselineActualData[monthIndex];
  //     } else if (selectedGroup.analysisType == 'energyIntensity') {
  //       modelYear = baselineYear;
  //       modeledEnergy = totalProduction * baselineYearEnergyIntensity;
  //     } else if (selectedGroup.analysisType == 'modifiedEnergyIntensity') {
  //       modelYear = baselineYear;
  //       let baseLoad: number = selectedGroup.averagePercentBaseload / 100;
  //       modeledEnergy = energyUse / (1 - ((1 - baseLoad) * (1 - ((energyUse / totalProduction) / baselineYearEnergyIntensity)) + (baseLoad * (1 - (energyUse / baselineActualData[monthIndex])))));
  //     }
  //     //calculate monthly savings
  //     let monthlySavings: number = 0;
  //     let rolling12MonthImprovement: number = 0;
  //     let rollingSEnPI: number = 1;
  //     let yearToDateSEnPI: number = 0;
  //     let yearToDateImprovement: number = 0;
  //     let yearToDateImprovementOverFiscalYear: number = 0;
  //     let monthlyIncrementalImprovement: number = 0;
  //     //skip incremental calcs for annual summary
  //     //just need energy calculations
  //     //if first year monthly savings = 0
  //     if (fiscalYear != baselineYear) {
  //       if (fiscalYear > modelYear) {
  //         //after model year
  //         monthlySavings = modeledEnergy - energyUse;
  //       } else {
  //         //before model year
  //         monthlySavings = previousMonthlySavings + ((previousEnergyUse - previousExpectedEnergyUse) - (energyUse - modeledEnergy));
  //       }
  //     }
  //     //track year to date energy use
  //     if (fiscalYear == baselineYear) {
  //       baselineExpectedData.push(modeledEnergy);
  //     }
  //     //sum values for year to data
  //     if (previousFiscalYear == fiscalYear) {
  //       yearToDateEnergyUse = yearToDateEnergyUse + energyUse;
  //       yearToDateExpectedEnergyUse = yearToDateExpectedEnergyUse + modeledEnergy;
  //     } else {
  //       //rest fiscal year values on new year
  //       previousFiscalYear = fiscalYear;
  //       yearToDateEnergyUse = energyUse;
  //       yearToDateExpectedEnergyUse = modeledEnergy;
  //     }

  //     //year to date SEnPI calculation
  //     //calculate baseline expected and entered energy use
  //     //in same months as baseline year
  //     // if(fiscalYear == 2014){
  //     //   debugger
  //     // }
  //     let baselineExpectedEnergy: number = 0;
  //     let baselineEnergy: number = 0;
  //     for (let i = 0; i <= monthIndex; i++) {
  //       baselineExpectedEnergy = baselineExpectedEnergy + baselineExpectedData[i];
  //       baselineEnergy = baselineEnergy + baselineActualData[i];
  //     }
  //     if (fiscalYear > modelYear) {
  //       //after regression model year
  //       yearToDateSEnPI = (yearToDateEnergyUse * baselineExpectedEnergy) / (yearToDateExpectedEnergyUse * baselineEnergy)
  //     } else {
  //       //regression model year or earlier
  //       yearToDateSEnPI = (yearToDateExpectedEnergyUse / yearToDateEnergyUse);
  //     }
  //     //track baseline SEnPI values
  //     if (fiscalYear == baselineYear) {
  //       baselineSEnPI.push(yearToDateSEnPI);
  //     }

  //     //calculate rolling SEnPI using previous 12 months of calculations
  //     if (summaryIndex > 10) {
  //       let last12MonthsEnergyTotal: number = energyUse;
  //       let last12MonthExpectedEnergyTotal: number = modeledEnergy;
  //       for (let i = (summaryIndex - 11); i < summaryIndex; i++) {
  //         last12MonthsEnergyTotal = last12MonthsEnergyTotal + analysisSummaryData[i].totalEnergy;
  //         last12MonthExpectedEnergyTotal = last12MonthExpectedEnergyTotal + analysisSummaryData[i].modeledEnergy;
  //       }
  //       if (fiscalYear > modelYear) {
  //         let baselineEnergyTotal: number = _.sum(baselineActualData);
  //         let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
  //         rollingSEnPI = (last12MonthsEnergyTotal * baselineExpectedEnergyTotal) / (last12MonthExpectedEnergyTotal * baselineEnergyTotal)
  //       } else {
  //         rollingSEnPI = (last12MonthExpectedEnergyTotal / last12MonthsEnergyTotal);
  //       }
  //     }

  //     //calculate year to date improvement
  //     if (fiscalYear > baselineYear) {
  //       if (fiscalYear > modelYear) {
  //         yearToDateImprovement = 1 - yearToDateSEnPI;
  //       } else {
  //         yearToDateImprovement = (1 - baselineSEnPI[monthIndex]) - (1 - yearToDateSEnPI);
  //       }
  //       monthlyIncrementalImprovement = yearToDateImprovement - previousYearToDateSEnPI;
  //       yearToDateImprovementOverFiscalYear = monthlyIncrementalImprovement;
  //       for (let i = 1; i <= monthIndex; i++) {
  //         yearToDateImprovementOverFiscalYear = yearToDateImprovementOverFiscalYear + (analysisSummaryData[summaryIndex - i].monthlyIncrementalImprovement / 100)
  //       }
  //     }
  //     //calculate rolling 12 month improvement
  //     if (fiscalYear > baselineYear) {
  //       if (fiscalYear > modelYear) {
  //         rolling12MonthImprovement = 1 - rollingSEnPI;
  //       } else {
  //         let baselineEnergyTotal: number = _.sum(baselineActualData);
  //         let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
  //         let baselineAnnualSEnPI: number = baselineExpectedEnergyTotal / baselineEnergyTotal;
  //         rolling12MonthImprovement = (1 - baselineAnnualSEnPI) - (1 - rollingSEnPI);
  //       }
  //     }

  //     //add results
  //     analysisSummaryData.push({
  //       totalEnergy: energyUse,
  //       predictorUsage: predictorUsage,
  //       modeledEnergy: modeledEnergy,
  //       date: new Date(baselineDate),
  //       group: selectedGroup,
  //       fiscalYear: fiscalYear,
  //       monthlySavings: monthlySavings,
  //       yearToDateImprovementOverBaseline: yearToDateImprovement * 100,
  //       yearToDateImprovementOverFiscalYear: yearToDateImprovementOverFiscalYear * 100,
  //       rollingYearImprovement: 0,
  //       yearToDateSEnPI: yearToDateSEnPI,
  //       rollingSEnPI: rollingSEnPI,
  //       monthlyIncrementalImprovement: monthlyIncrementalImprovement * 100,
  //       rolling12MonthImprovement: rolling12MonthImprovement * 100,
  //       energyIntensity: energyIntensity
  //     });

  //     //set values for next iterations calculations
  //     previousYearToDateSEnPI = yearToDateImprovement;
  //     previousEnergyUse = energyUse;
  //     previousExpectedEnergyUse = modeledEnergy;
  //     previousMonthlySavings = monthlySavings;
  //     let currentMonth: number = baselineDate.getUTCMonth()
  //     let nextMonth: number = currentMonth + 1;
  //     baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
  //     summaryIndex++;
  //   }

  //   return {
  //     predictorVariables: predictorVariables,
  //     modelYear: undefined,
  //     monthlyAnalysisSummaryData: analysisSummaryData
  //   }
  // }

  // getMEIAnnualAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualAnalysisSummary> {
  //   let annualAnalysisSummary: Array<AnnualAnalysisSummary> = new Array();
  //   let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
  //   let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroupId });
  //   let calanderizationOptions: CalanderizationOptions = {
  //     energyIsSource: analysisItem.energyIsSource
  //   }
  //   let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
  //   calanderizedMeterData.forEach(calanderizedMeter => {
  //     calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
  //   });
  //   let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

  //   let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
  //   let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
  //   let reportYear: number = analysisItem.reportYear;
  //   if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
  //     baselineYear = baselineYear - 1;
  //     reportYear = reportYear - 1;
  //   }
  //   let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
  //   let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
  //   let predictorVariables: Array<PredictorData> = new Array();
  //   selectedGroup.predictorVariables.forEach(variable => {
  //     if (variable.productionInAnalysis) {
  //       predictorVariables.push(variable)
  //     }
  //   });
  //   let baselineEnergyUse: number = _.sumBy(baselineMeterData, 'energyUse');

  //   let baselineProduction: number = this.analysisCalculationsHelperService.getPredictorUsage(predictorVariables, baselineYearPredictorData);
  //   let baselineEnergyIntensity: number = baselineEnergyUse / baselineProduction;

  //   let previousYearSavings: number = 0;
  //   let previousYearEnergyUse: number = baselineEnergyUse;
  //   let totalEnergySavings: number = 0;
  //   let totalModeledEnergySavings: number = 0;
  //   let previousYearModeledEnergyUse: number;
  //   let baselineModeledEnergy: number;
  //   let baselineSEnPI: number;
  //   for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
  //     //predictor data for summary year
  //     let summaryYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, summaryYear, facility);
  //     let totalPredictorUsage: number = this.analysisCalculationsHelperService.getPredictorUsage(predictorVariables, summaryYearPredictorData);
  //     //meter data for summary year
  //     let summaryYearMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, summaryYear, facility);
  //     let totalMeterEnergyUse: number = _.sumBy(summaryYearMeterData, 'energyUse');


  //     let energyIntensity: number = totalMeterEnergyUse / totalPredictorUsage;
  //     let baseload: number = selectedGroup.averagePercentBaseload / 100;
  //     let modeledEnergyUse: number = totalMeterEnergyUse / (1 - (baseload * (1 - (totalMeterEnergyUse / baselineEnergyUse)) + (1 - baseload) * (1 - (energyIntensity / baselineEnergyIntensity))));
  //     if (summaryYear == baselineYear) {
  //       baselineModeledEnergy = modeledEnergyUse;
  //     }

  //     let SEnPI: number;
  //     let cumulativeSavings: number = 0;
  //     let annualSavings: number = 0;
  //     if (summaryYear > baselineYear) {
  //       SEnPI = (totalMeterEnergyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
  //     } else {
  //       SEnPI = modeledEnergyUse / totalMeterEnergyUse;
  //     }
  //     if (summaryYear == baselineYear) {
  //       baselineSEnPI = SEnPI;
  //       previousYearEnergyUse = totalMeterEnergyUse;
  //       previousYearModeledEnergyUse = modeledEnergyUse;
  //     } else if (summaryYear > baselineYear) {
  //       cumulativeSavings = 1 - SEnPI;
  //       annualSavings = cumulativeSavings - previousYearSavings;
  //     } else {
  //       cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
  //       annualSavings = cumulativeSavings - previousYearSavings;
  //     }

  //     let annualEnergySavings: number = previousYearEnergyUse - totalMeterEnergyUse;
  //     let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergyUse;
  //     totalEnergySavings = totalEnergySavings + annualEnergySavings;
  //     totalModeledEnergySavings = totalModeledEnergySavings + annualModeledEnergySavings;

  //     annualAnalysisSummary.push({
  //       year: summaryYear,
  //       energyUse: totalMeterEnergyUse,
  //       annualEnergySavings: annualEnergySavings,
  //       totalEnergySavings: totalEnergySavings,
  //       annualModeledEnergySavings: annualModeledEnergySavings,
  //       totalModeledEnergySavings: totalModeledEnergySavings,
  //       modeledEnergyUse: modeledEnergyUse,
  //       SEnPI: SEnPI,
  //       cumulativeSavings: cumulativeSavings * 100,
  //       annualSavings: annualSavings * 100,
  //       energyIntensity: energyIntensity,
  //       totalProduction: 0,
  //       totalEnergyIntensityChange: 0,
  //       totalProductionChange: 0,
  //       annualProductionChange: 0,
  //       annualEnergyIntensityChange: 0
  //     })
  //     previousYearSavings = cumulativeSavings;
  //     previousYearEnergyUse = totalMeterEnergyUse;
  //     previousYearModeledEnergyUse = modeledEnergyUse;

  //   }
  //   return annualAnalysisSummary;
  // }


  getMonthlyAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): MonthlyAnalysisSummary {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let predictorVariables: Array<PredictorData> = new Array();
    let productionVariables: Array<PredictorData> = new Array();
    if (selectedGroup.analysisType != 'absoluteEnergyConsumption') {
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

    let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();

    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    let baselineYearEnergyIntensity: number = this.getBaselineEnergyIntensity(selectedGroup, facility, allMeterData, baselineYear, predictorVariables, facilityPredictorData);


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
      let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility);
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
      yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualEnergyUseData.push(energyUse);
      }


      let predictorUsage: Array<number> = new Array();
      let productionUsage: Array<number> = new Array();
      predictorVariables.forEach(variable => {
        let usageVal: number = 0;
        monthPredictorData.forEach(data => {
          let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
          usageVal = usageVal + predictorData.amount;
        });
        predictorUsage.push(usageVal);
        if (variable.production) {
          productionUsage.push(usageVal);
        }
      });

      let modeledEnergy: number = 0;
      let baselineActualEnergyUse: number = baselineActualEnergyUseData[monthIndex];
      yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
      if (selectedGroup.analysisType == 'regression') {
        modeledEnergy = this.calculateRegressionModeledEnergy(selectedGroup, predictorVariables, monthPredictorData);
      } else if (selectedGroup.analysisType == 'absoluteEnergyConsumption') {
        modeledEnergy = baselineActualEnergyUse;
      } else if (selectedGroup.analysisType == 'energyIntensity') {
        modeledEnergy = this.calculateEnergyIntensityModeledEnergy(baselineYearEnergyIntensity, productionUsage);
      } else if (selectedGroup.analysisType == 'modifiedEnergyIntensity') {
        modeledEnergy = this.calculateModifiedEnegyIntensityModeledEnergy(selectedGroup, baselineYearEnergyIntensity, baselineActualEnergyUse, productionUsage);
      }
      if(modeledEnergy < 0){
        modeledEnergy = 0;
      }
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
        energyUse: energyUse,
        predictorUsage: predictorUsage,
        modeledEnergy: modeledEnergy,
        date: new Date(baselineDate),
        group: selectedGroup,
        fiscalYear: fiscalYear,
        adjustedBaselineEnergyUse: adjustedBaselineEnergyUse,
        SEnPI: SEnPI,
        savings: savings,
        percentSavingsComparedToBaseline: percentSavingsComparedToBaseline * 100,
        yearToDateSavings: yearToDateSavings,
        yearToDatePercentSavings: yearToDatePercentSavings * 100,
        rollingSavings: rollingSavings,
        rolling12MonthImprovement: rolling12MonthImprovement * 100
      });
      summaryDataIndex++;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }

    return {
      predictorVariables: predictorVariables,
      modelYear: undefined,
      monthlyAnalysisSummaryData: analysisSummaryData
    }

  }

  calculateRegressionModeledEnergy(selectedGroup: AnalysisGroup, predictorVariables: Array<PredictorData>, monthPredictorData: Array<IdbPredictorEntry>): number {
    let modeledEnergy: number = 0;
    predictorVariables.forEach(variable => {
      let usageVal: number = 0;
      monthPredictorData.forEach(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        usageVal = usageVal + predictorData.amount;
      });
      modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
    });
    modeledEnergy = modeledEnergy + selectedGroup.regressionConstant;
    return modeledEnergy;
  }

  calculateEnergyIntensityModeledEnergy(baselineEnergyIntensity: number, productionUsage: Array<number>): number {
    let totalProductionUsage: number = _.sum(productionUsage);
    return baselineEnergyIntensity * totalProductionUsage;
  }

  getBaselineEnergyIntensity(selectedGroup: AnalysisGroup, facility: IdbFacility, allMeterData: Array<MonthlyData>, baselineYear: number, predictorVariables: Array<PredictorData>, facilityPredictorData: Array<IdbPredictorEntry>): number {
    if (selectedGroup.analysisType == 'energyIntensity' || selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
      let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
      let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
      let totalPredictorUsage: number = this.analysisCalculationsHelperService.getPredictorUsage(predictorVariables, baselineYearPredictorData);
      return totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      return 0
    }
  }

  calculateModifiedEnegyIntensityModeledEnergy(selectedGroup: AnalysisGroup, baselineYearEnergyIntensity: number, baselineEnergyUse: number, productionUsage: Array<number>): number {
    let totalProduction: number = _.sum(productionUsage);
    let baseLoad: number = selectedGroup.averagePercentBaseload / 100;
    return baselineYearEnergyIntensity * totalProduction * (1 - baseLoad) + (baselineEnergyUse * baseLoad);
  }


  getAnnualAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualAnalysisSummary> {
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getMonthlyAnalysisSummary(selectedGroup, analysisItem, facility).monthlyAnalysisSummaryData;
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = this.calculateAnnualAnalysisSummary(monthlyAnalysisSummaryData, analysisItem, facility);
    return annualAnalysisSummaries;
  }


  calculateAnnualAnalysisSummary(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData | FacilityMonthlyAnalysisSummaryData>, analysisItem: IdbAnalysisItem, facility: IdbFacility ): Array<AnnualAnalysisSummary>{
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = new Array();
    let baselineEnergyUse: number;
    let baselineModeledEnergyUse: number;
    let cummulativeSavings: number = 0;
    let previousYearSavings: number = 0;
    let previousYearPercentSavings: number = 0;
    while (baselineYear <= reportYear) {
      let yearData: Array<MonthlyAnalysisSummaryData> = _.filter(monthlyAnalysisSummaryData, (data) => {
        return data.fiscalYear == baselineYear;
      });
      let energyUse: number = _.sumBy(yearData, 'energyUse');
      let modeledEnergy: number = _.sumBy(yearData, 'modeledEnergy');
      let adjustedBaselineEnergyUse: number = _.sumBy(yearData, 'adjustedBaselineEnergyUse');
      if (baselineYear == facility.sustainabilityQuestions.energyReductionBaselineYear) {
        baselineEnergyUse = energyUse;
        baselineModeledEnergyUse = modeledEnergy;
      }
      let SEnPI: number = energyUse / (modeledEnergy + (baselineEnergyUse - baselineModeledEnergyUse));
      let savings: number = (baselineEnergyUse - baselineModeledEnergyUse) - (energyUse - modeledEnergy);
      let totalSavingsPercentImprovement: number = (savings / adjustedBaselineEnergyUse);
      let annualSavingsPercentImprovement: number = totalSavingsPercentImprovement - previousYearPercentSavings;
      let adjustmentToBaseline: number = adjustedBaselineEnergyUse - baselineEnergyUse;
      cummulativeSavings = cummulativeSavings + savings;
      let newSavings: number = savings - previousYearSavings;
      annualAnalysisSummaries.push({

        year: baselineYear,
        energyUse: energyUse,
        modeledEnergy: modeledEnergy,
        adjustedBaselineEnergyUse: adjustedBaselineEnergyUse,
        SEnPI: SEnPI,
        savings: savings,
        totalSavingsPercentImprovement: totalSavingsPercentImprovement * 100,
        annualSavingsPercentImprovement: annualSavingsPercentImprovement * 100,
        adjustmentToBaseline: adjustmentToBaseline,
        cummulativeSavings: cummulativeSavings,
        newSavings: newSavings
      })
      previousYearPercentSavings = totalSavingsPercentImprovement;
      previousYearSavings = savings;
      baselineYear++;
    }

    return annualAnalysisSummaries;
  }

}
