import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { BetterPlantsSummary, ReportOptions } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { AccountAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/account-analysis-calculations.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { FacilityAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/facility-analysis-calculations.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Injectable({
  providedIn: 'root'
})
export class BetterPlantsReportService {

  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService, private accountAnalysisCalculationsService: AccountAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService, private convertMeterDataService: ConvertMeterDataService,
    private convertUnitsService: ConvertUnitsService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService, private facilityDbService: FacilitydbService) { }


  getBetterPlantsSummary(reportOptions: ReportOptions, account: IdbAccount): BetterPlantsSummary {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == reportOptions.analysisItemId });

    // if (selectedAnalysisItem.baselineAdjustment) {
    //   let convertedAdjustment: number = this.convertUnitsService.value(selectedAnalysisItem.baselineAdjustment).from(selectedAnalysisItem.energyUnit).to('MMBtu');
    //   baselineAdjustment = baselineAdjustment + convertedAdjustment;
    // }

    //Better Plants = MMBtu
    selectedAnalysisItem.energyUnit = 'MMBtu';
    let includedFacilityIds: Array<string> = new Array();
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId) {
        includedFacilityIds.push(item.facilityId);
      }
    });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedFacilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return includedFacilityIds.includes(meter.facilityId) });
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(includedFacilityMeters, true, true, { energyIsSource: true });
    calanderizedMeters.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(selectedAnalysisItem, calanderizedMeter.monthlyData, account, calanderizedMeter.meter);
    });


    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let facilityPerformance: Array<{ facility: IdbFacility, performance: number }> = new Array();
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId) {
        let facilityAnalysisItem: IdbAnalysisItem = facilityAnalysisItems.find(facilityItem => { return facilityItem.guid == item.analysisItemId });
        // if (facilityAnalysisItem.baselineAdjustment) {
        //   let convertedAdjustment: number = this.convertUnitsService.value(facilityAnalysisItem.baselineAdjustment).from(facilityAnalysisItem.energyUnit).to('MMBtu');
        //   baselineAdjustment = baselineAdjustment + convertedAdjustment;
        // }
        let facility: IdbFacility = facilities.find(f => { return f.guid == item.facilityId });
        let annualAnalysisSummary: Array<AnnualAnalysisSummary> = this.facilityAnalysisCalculationsService.getAnnualAnalysisSummary(facilityAnalysisItem, facility, calanderizedMeters)
        let reportYearAnalysisSummary: AnnualAnalysisSummary = annualAnalysisSummary.find(summary => { return summary.year == selectedAnalysisItem.reportYear });
        facilityPerformance.push({
          facility: facility,
          performance: reportYearAnalysisSummary.totalSavingsPercentImprovement
        })
      }
    });

    let annualAnalysisSummary: Array<AnnualAnalysisSummary> = this.accountAnalysisCalculationsService.getAnnualAnalysisSummary(selectedAnalysisItem, account, calanderizedMeters);
    let reportYearAnalysisSummary: AnnualAnalysisSummary = annualAnalysisSummary.find(summary => { return summary.year == reportOptions.targetYear });
    let baselineYearAnalysisSummary: AnnualAnalysisSummary = annualAnalysisSummary.find(summary => { return summary.year == reportOptions.baselineYear });





    let baselineYearElectricityUse: number = 0;
    let reportYearElectricityUse: number = 0;
    let baselineNaturalGasUse: number = 0;
    let reportYearNaturalGasUse: number = 0;
    let baselineDistilateFuelUse: number = 0;
    let reportYearDistilateFuelUse: number = 0;
    let baselineResidualFuelUse: number = 0;
    let reportYearResidualFuelUse: number = 0;
    let baselineCoalUse: number = 0;
    let reportYearCoalUse: number = 0;
    let baselineCokeUse: number = 0;
    let reportYearCokeUse: number = 0;
    let baselineBlastFurnaceUse: number = 0;
    let reportYearBlastFurnaceUse: number = 0;
    let baselineWoodWasteUse: number = 0;
    let reportYearWoodWasteUse: number = 0;

    let otherGasFuels: Array<string> = new Array();
    let baselineOtherGasUse: number = 0;
    let reportYearOtherGasUse: number = 0;
    let otherSolidFuels: Array<string> = new Array();
    let baselineOtherSolidUse: number = 0;
    let reportYearOtherSolidUse: number = 0;
    let otherLiquidFuels: Array<string> = new Array();
    let baselineOtherLiquidUse: number = 0;
    let reportYearOtherLiquidUse: number = 0;
    let baselineTotalEnergyUse: number = 0;
    let reportYearTotalEnergyUse: number = 0;

    calanderizedMeters.forEach(calanderizedMeter => {
      let baselineYearData: Array<MonthlyData> = calanderizedMeter.monthlyData.filter(dataItem => {
        let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(dataItem.date), account);
        return fiscalYear == reportOptions.baselineYear
      });


      let reportYearData: Array<MonthlyData> = calanderizedMeter.monthlyData.filter(dataItem => {
        let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(dataItem.date), account);
        return fiscalYear == reportOptions.targetYear
      });

      let baselineEnergyUse: number = _.sumBy(baselineYearData, 'energyUse');
      baselineTotalEnergyUse = baselineTotalEnergyUse + baselineEnergyUse;

      let reportYearEnergyUse: number = _.sumBy(reportYearData, 'energyUse');
      reportYearTotalEnergyUse = reportYearTotalEnergyUse + reportYearEnergyUse;

      if (calanderizedMeter.meter.source == 'Electricity') {
        baselineYearElectricityUse = baselineYearElectricityUse + baselineEnergyUse;
        reportYearElectricityUse = reportYearElectricityUse + reportYearEnergyUse;
      } else if (calanderizedMeter.meter.source == 'Natural Gas') {
        baselineNaturalGasUse = baselineNaturalGasUse + baselineEnergyUse;
        reportYearNaturalGasUse = reportYearNaturalGasUse + reportYearEnergyUse;
      } else if (calanderizedMeter.meter.source == 'Other Fuels') {
        let distilateFuels: Array<string> = ['Distillate Fuel Oil', 'Diesel', 'Fuel Oil #1', 'Fuel Oil #2', 'Fuel Oil #2'];
        let residualFuels: Array<string> = ['Residual Fuel Oil', 'Fuel Oil #5', 'Fuel Oil #6 (low sulfur)', 'Fuel Oil #6 (high sulfur)'];
        let coalFuels: Array<string> = ['Coal (anthracite)', 'Coal (bituminous)', 'Coal (Lignite)', 'Coal (subbituminous)']
        let cokeFuels: Array<string> = ['Coke', 'Coke Over Gas']
        if (distilateFuels.includes(calanderizedMeter.meter.fuel)) {
          baselineDistilateFuelUse = baselineDistilateFuelUse + baselineEnergyUse;
          reportYearDistilateFuelUse = reportYearDistilateFuelUse + reportYearEnergyUse;
        } else if (residualFuels.includes(calanderizedMeter.meter.fuel)) {
          baselineResidualFuelUse = baselineResidualFuelUse + baselineEnergyUse;
          reportYearResidualFuelUse = reportYearResidualFuelUse + reportYearEnergyUse;
        } else if (coalFuels.includes(calanderizedMeter.meter.fuel)) {
          baselineCoalUse = baselineCoalUse + baselineEnergyUse;
          reportYearCoalUse = reportYearCoalUse + reportYearEnergyUse;
        } else if (cokeFuels.includes(calanderizedMeter.meter.fuel)) {
          baselineCokeUse = baselineCokeUse + baselineEnergyUse;
          reportYearCokeUse = reportYearCokeUse + reportYearEnergyUse;
        } else if (calanderizedMeter.meter.fuel == 'Blast Furnace Gas') {
          baselineBlastFurnaceUse = baselineBlastFurnaceUse + baselineEnergyUse;
          reportYearBlastFurnaceUse = reportYearBlastFurnaceUse + reportYearEnergyUse;
        } else if (calanderizedMeter.meter.fuel == 'Wood') {
          baselineWoodWasteUse = baselineWoodWasteUse + baselineEnergyUse;
          reportYearWoodWasteUse = reportYearWoodWasteUse + reportYearEnergyUse;
        } else {
          if (calanderizedMeter.meter.phase == 'Gas') {
            baselineOtherGasUse = baselineOtherGasUse + baselineEnergyUse;
            reportYearOtherGasUse = reportYearOtherGasUse + reportYearEnergyUse;
            if (!otherGasFuels.includes(calanderizedMeter.meter.fuel)) {
              otherGasFuels.push(calanderizedMeter.meter.fuel);
            }
          } else if (calanderizedMeter.meter.phase == 'Liquid') {
            baselineOtherLiquidUse = baselineOtherLiquidUse + baselineEnergyUse;
            reportYearOtherLiquidUse = reportYearOtherLiquidUse + reportYearEnergyUse;
            if (!otherLiquidFuels.includes(calanderizedMeter.meter.fuel)) {
              otherLiquidFuels.push(calanderizedMeter.meter.fuel);
            }

          } else if (calanderizedMeter.meter.phase == 'Solid') {
            baselineOtherSolidUse = baselineOtherSolidUse + baselineEnergyUse;
            reportYearOtherSolidUse = reportYearOtherSolidUse + reportYearEnergyUse;
            otherSolidFuels.push(calanderizedMeter.meter.fuel);

          }
        }
      }
    });
    let adjustedBaselinePrimaryEnergy: number = reportYearAnalysisSummary.baselineAdjustmentForOther + baselineTotalEnergyUse + reportYearAnalysisSummary.baselineAdjustmentForNormalization;
    let totalEnergySavings: number = adjustedBaselinePrimaryEnergy - reportYearTotalEnergyUse;

    // let percentAnnualImprovement: number = (reportYearAnalysisSummary.newSavings / adjustedBaselinePrimaryEnergy) * 100;
    let percentTotalImprovement: number = (totalEnergySavings / adjustedBaselinePrimaryEnergy) * 100;

    return {
      facilityPerformance: facilityPerformance,
      percentAnnualImprovement: reportYearAnalysisSummary.annualSavingsPercentImprovement,
      percentTotalImprovement: percentTotalImprovement,
      adjustedBaselinePrimaryEnergy: adjustedBaselinePrimaryEnergy,
      // baselineAdjustment: reportYearAnalysisSummary.baselineAdjustmentForOther,
      reportYearAnalysisSummary: reportYearAnalysisSummary,
      baselineYearAnalysisSummary: baselineYearAnalysisSummary,
      totalEnergySavings: totalEnergySavings,
      baselineYearResults: {
        numberOfFacilities: includedFacilityIds.length,
        electricityUse: baselineYearElectricityUse,
        naturalGasUse: baselineNaturalGasUse,
        distilateFuelUse: baselineDistilateFuelUse,
        residualFuelUse: baselineResidualFuelUse,
        coalUse: baselineCoalUse,
        cokeEnergyUse: baselineCokeUse,
        blastFurnaceEnergyUse: baselineBlastFurnaceUse,
        woodWasteEnergyUse: baselineWoodWasteUse,
        otherGasFuels: otherGasFuels,
        otherGasUse: baselineOtherGasUse,
        otherLiquidFuels: otherLiquidFuels,
        otherLiquidUse: baselineOtherLiquidUse,
        otherSolidFuels: otherSolidFuels,
        otherSolidUse: baselineOtherSolidUse,
        totalEnergyUse: baselineTotalEnergyUse
      },
      reportYearResults: {
        numberOfFacilities: includedFacilityIds.length,
        electricityUse: reportYearElectricityUse,
        naturalGasUse: reportYearNaturalGasUse,
        distilateFuelUse: reportYearDistilateFuelUse,
        residualFuelUse: reportYearResidualFuelUse,
        coalUse: reportYearCoalUse,
        cokeEnergyUse: reportYearCokeUse,
        blastFurnaceEnergyUse: reportYearBlastFurnaceUse,
        woodWasteEnergyUse: reportYearWoodWasteUse,
        otherGasFuels: otherGasFuels,
        otherGasUse: reportYearOtherGasUse,
        otherLiquidFuels: otherLiquidFuels,
        otherLiquidUse: reportYearOtherLiquidUse,
        otherSolidFuels: otherSolidFuels,
        otherSolidUse: reportYearOtherSolidUse,
        totalEnergyUse: reportYearTotalEnergyUse
      }
    }



  }
}
