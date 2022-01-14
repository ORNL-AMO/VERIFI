import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyIntensityService {

  constructor(private calendarizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService) { }

  calculateAnnualGroupSummaries(analysisItem: IdbAnalysisItem, selectedGroup: AnalysisGroup, facility: IdbFacility): Array<AnnualGroupSummary> {
    let annualGroupSummaries: Array<AnnualGroupSummary> = new Array();
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroup.id });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false);
    let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

    let baselineEnergyUse: number;
    let previousYearEnergyUse: number;
    let baselineProduction: number;
    let baselineEnergyIntensity: number;
    let previousYearEnergyIntensity: number = 0;
    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let productionPredictors: Array<PredictorData> = selectedGroup.predictorVariables.filter(variable => {
      return variable.production;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });
    for (let summaryYear: number = baselineYear; summaryYear <= analysisItem.reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyData> = allMeterData.filter(data => {
        return data.year == summaryYear;
      });
      let totalEnergyUse: number = _.sumBy(summaryYearData, 'energyUse');
      let summaryYearPredictors: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        return new Date(predictorData.date).getUTCFullYear() == summaryYear;
      });

      let predictorData: Array<PredictorData> = summaryYearPredictors.flatMap(yearPredictor => { return yearPredictor.predictors });
      let productionPredictors: Array<PredictorData> = predictorData.filter(data => { return productionPredictorIds.includes(data.id) });

      let totalProduction: number = _.sumBy(productionPredictors, 'amount');
      let energyIntensity: number = totalEnergyUse / totalProduction;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = totalEnergyUse;
        previousYearEnergyUse = totalEnergyUse;
        baselineProduction = totalProduction
        baselineEnergyIntensity = energyIntensity;
      }

      let cumulativeEnergyIntensityChange: number = (1 - (energyIntensity / baselineEnergyIntensity)) * 100;

      annualGroupSummaries.push({
        year: summaryYear,
        totalEnergy: totalEnergyUse,
        totalEnergySavings: baselineEnergyUse - totalEnergyUse,
        newEnergySavings: previousYearEnergyUse - totalEnergyUse,
        totalProduction: totalProduction,
        productionChange: baselineProduction - totalProduction,
        energyIntensity: energyIntensity,
        cumulativeEnergyIntensityChange: cumulativeEnergyIntensityChange,
        annualEnergyIntensityChange: cumulativeEnergyIntensityChange - previousYearEnergyIntensity

      });
      previousYearEnergyUse = totalEnergyUse;
      previousYearEnergyIntensity = cumulativeEnergyIntensityChange;
    }
    return annualGroupSummaries;
  }

}


export interface AnnualGroupSummary {
  year: number,
  totalEnergy: number,
  totalEnergySavings: number,
  newEnergySavings: number,
  totalProduction: number,
  productionChange: number,
  energyIntensity: number,
  cumulativeEnergyIntensityChange: number,
  annualEnergyIntensityChange: number
}
