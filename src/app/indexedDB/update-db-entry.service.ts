import { Injectable } from '@angular/core';
import { AnalysisSetupErrors, GroupErrors } from '../models/analysis';
import { FacilitydbService } from './facility-db.service';
import { AnalysisValidationService } from '../shared/helper-services/analysis-validation.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeter, MeterCharge } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { getGUID } from '../shared/sharedHelperFuntions';
import { ChargeCostUnit, MeterChargeType } from '../shared/shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';

@Injectable({
  providedIn: 'root'
})
export class UpdateDbEntryService {

  constructor(private analysisValidationService: AnalysisValidationService, private facilityDbService: FacilitydbService) { }

  updateAccount(account: IdbAccount): { account: IdbAccount, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!account.electricityUnit) {
      account.electricityUnit = 'kWh';
      isChanged = true;
    }

    if (account.volumeGasUnit == 'MCF') {
      account.volumeGasUnit = 'kSCF';
      isChanged = true;
    }

    if (!account.archiveOption) {
      account.archiveOption = 'skip';
      isChanged = true;
    }

    if (!account.assessmentReportVersion) {
      account.assessmentReportVersion = 'AR5';
      isChanged = true;
    }

    return { account: account, isChanged: isChanged };
  }

  updateFacility(facility: IdbFacility): { facility: IdbFacility, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!facility.electricityUnit) {
      facility.electricityUnit = 'kWh';
      isChanged = true;
    }

    if (facility.volumeGasUnit == 'MCF') {
      facility.volumeGasUnit = 'kSCF';
      isChanged = true;
    }

    if (!facility.classification) {
      facility.classification = 'Manufacturing';
      isChanged = true;
    }

    return { facility: facility, isChanged: isChanged };
  }

  updateAnalysis(analysisItem: IdbAnalysisItem): { analysisItem: IdbAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }
    if (!analysisItem.setupErrors) {
      analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      isChanged = true;
    } else {
      let setupErrors: AnalysisSetupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
      Object.keys(setupErrors).forEach(key => {
        if (setupErrors[key] != analysisItem.setupErrors[key]) {
          analysisItem.setupErrors[key] = setupErrors[key];
          isChanged = true;
        }
      });
    }
    if (!analysisItem.baselineYear) {
      let facility: IdbFacility = this.facilityDbService.getFacilityById(analysisItem.facilityId);
      if (facility && facility.sustainabilityQuestions) {
        analysisItem.baselineYear = facility.sustainabilityQuestions.energyReductionBaselineYear;
      } else {
        analysisItem.baselineYear = 2017;
      }
      isChanged = true;
    }

    if (analysisItem.groups) {
      analysisItem.groups.forEach(group => {
        if (!group.groupErrors) {
          group.groupErrors = this.analysisValidationService.getGroupErrors(group, analysisItem);
          isChanged = true;
        } else {
          let groupErrors: GroupErrors = this.analysisValidationService.getGroupErrors(group, analysisItem);
          Object.keys(groupErrors).forEach(key => {
            if (groupErrors[key] != group.groupErrors[key]) {
              group.groupErrors[key] = groupErrors[key];
              isChanged = true;
            }
          });
        }

        if (group['baselineAdjustments'] != undefined) {
          group.hasDataAdjustement = group['hasBaselineAdjustement'];
          delete group['hasBaselineAdjustement'];
          group.dataAdjustments = group['baselineAdjustments'];
          delete group['baselineAdjustments'];
          isChanged = true;
        }

        if (group.baselineAdjustmentsV2 == undefined) {
          group.hasBaselineAdjustmentV2 = false;
          let yearBaselineAdjustments: Array<{ year: number, amount: number }> = new Array();
          for (let year: number = analysisItem.baselineYear + 1; year <= analysisItem.reportYear; year++) {
            yearBaselineAdjustments.push({
              year: year,
              amount: 0
            })
          }
          group.baselineAdjustmentsV2 = yearBaselineAdjustments;
          isChanged = true;
        }
        if (group.maxModelVariables == undefined) {
          group.maxModelVariables = 4;
          isChanged = true;
        }
      });
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }

  updateAccountAnalysis(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, facilityAnalysisItems: Array<IdbAnalysisItem>): { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } {
    let isChanged: boolean = false;
    if (!analysisItem.analysisCategory) {
      analysisItem.analysisCategory = 'energy';
      isChanged = true;
    }

    if (!analysisItem.baselineYear) {
      if (account && account.sustainabilityQuestions) {
        analysisItem.baselineYear = account.sustainabilityQuestions.energyReductionBaselineYear;
      } else {
        analysisItem.baselineYear = 2017;
      }
      isChanged = true;
    }

    if (!analysisItem.setupErrors) {
      analysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(analysisItem, facilityAnalysisItems);
      isChanged = true;
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }

  updateUtilityMeter(utilityMeter: IdbUtilityMeter,
    utilityMeterData: Array<IdbUtilityMeterData>
  ): { utilityMeter: IdbUtilityMeter, isChanged: boolean, utilityMeterData: Array<IdbUtilityMeterData>, meterDataChanged: boolean } {
    let isChanged: boolean = false;
    let meterDataChanged: boolean = false;
    let meterData: Array<IdbUtilityMeterData>;
    let source: string = utilityMeter.source;
    if (source == 'Water') {
      isChanged = true;
      utilityMeter.source = 'Water Intake';
      utilityMeter.waterIntakeType = 'Municipal (Potable)';
    } else if (source == 'Waste Water') {
      isChanged = true;
      utilityMeter.source = 'Water Discharge';
      utilityMeter.waterDischargeType = 'Municipal Sewer';
    } else if (source == 'Other Utility') {
      isChanged = true;
      utilityMeter.source = 'Other';
    }

    if (utilityMeter.startingUnit == 'Dtherm') {
      utilityMeter.startingUnit = 'DTherm';
      isChanged = true;
    }

    if (utilityMeter.energyUnit == 'Dtherm') {
      utilityMeter.energyUnit = 'DTherm';
      isChanged = true;
    }

    if (utilityMeter.fuel == 'Fuel Oil #5') {
      isChanged = true;
      utilityMeter.fuel = "Fuel Oil #5 (Navy Special)";
    }

    if (utilityMeter.importWizardName) {
      delete utilityMeter.importWizardName;
      isChanged = true;
    }


    if (!utilityMeter.charges) {
      if(!utilityMeter.demandUnit){
        utilityMeter.demandUnit = 'kW';
      }
      utilityMeter.charges = [];
      isChanged = true;
      meterDataChanged = true;
      meterData = utilityMeterData.filter(data => data.meterId == utilityMeter.guid);
      meterData.forEach(dataItem => {
        if(!dataItem.charges){
          dataItem.charges = [];
        }
        if (dataItem.commodityCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.commodityCharge, 0, 'consumption', 'Commodity Charge');
        }
        if (dataItem.deliveryCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.deliveryCharge, 0, 'consumption', 'Delivery Charge');
        }
        //electricity
        if (dataItem.nonEnergyCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.nonEnergyCharge, 0, 'other', 'Non-Energy Charge');
        }
        if (dataItem.block1Consumption || dataItem.block1ConsumptionCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.block1ConsumptionCharge, dataItem.block1Consumption, 'consumption', 'Block 1 Consumption Charge');
        }
        if (dataItem.block2Consumption || dataItem.block2ConsumptionCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.block2ConsumptionCharge, dataItem.block2Consumption, 'consumption', 'Block 2 Consumption Charge');
        }
        if (dataItem.block3Consumption || dataItem.block3ConsumptionCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.block3ConsumptionCharge, dataItem.block3Consumption, 'consumption', 'Block 3 Consumption Charge');
        }
        if (dataItem.otherConsumption || dataItem.otherConsumptionCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.otherConsumptionCharge, dataItem.otherConsumption, 'consumption', 'Other Consumption Charge');
        }
        if (dataItem.onPeakAmount || dataItem.onPeakCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.onPeakCharge, dataItem.onPeakAmount, 'consumption', 'On-Peak Charge');
        }
        if (dataItem.offPeakAmount || dataItem.offPeakCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.offPeakCharge, dataItem.offPeakAmount, 'consumption', 'Off-Peak Charge');
        }
        if (dataItem.transmissionAndDeliveryCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.transmissionAndDeliveryCharge, 0, 'consumption', 'Transmission and Delivery Charge');
        }
        if (dataItem.powerFactor || dataItem.powerFactorCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.powerFactorCharge, 0, 'other', 'Power Factor Charge');
        }
        if (dataItem.localSalesTax) {
          this.addCharge(utilityMeter, dataItem, dataItem.localSalesTax, 0, 'tax', 'Local Sales Tax');
        }
        if (dataItem.stateSalesTax) {
          this.addCharge(utilityMeter, dataItem, dataItem.stateSalesTax, 0, 'tax', 'State Sales Tax');
        }
        if (dataItem.latePayment) {
          this.addCharge(utilityMeter, dataItem, dataItem.latePayment, 0, 'lateFee', 'Late Payment');
        }
        if (dataItem.otherCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.otherCharge, 0, 'other', 'Other Charge');
        }
        //non-electricity
        if (dataItem.demandUsage || dataItem.demandCharge) {
          this.addCharge(utilityMeter, dataItem, dataItem.demandCharge, dataItem.demandUsage, 'demand', 'Demand Charge');
        }
      })
    }
    return { utilityMeter: utilityMeter, isChanged: isChanged, utilityMeterData: meterData, meterDataChanged: meterDataChanged };
  }

  addCharge(meter: IdbUtilityMeter, meterData: IdbUtilityMeterData, chargeAmount: number, chargeUsage: number, chargeType: MeterChargeType, chargeName: string): void {
    let chargeExists: MeterCharge = meter.charges.find(charge => charge.name == chargeName);
    if (chargeExists) {
      meterData.charges.push({
        chargeGuid: chargeExists.guid,
        chargeAmount: chargeAmount,
        chargeUsage: chargeUsage
      })
    } else {
      let guid: string = getGUID();
      meter.charges.push({
        guid: guid,
        name: chargeName,
        chargeType: chargeType,
        displayUsageInTable: true,
        displayChargeInTable: true
      })
      meterData.charges.push({
        chargeGuid: guid,
        chargeAmount: chargeAmount,
        chargeUsage: chargeUsage
      });
    }
  }

  updateReport(report: IdbAccountReport, facilities: Array<IdbFacility>, groups: Array<IdbUtilityMeterGroup>): { report: IdbAccountReport, isChanged: boolean } {
    let isChanged: boolean = false;
    if (report.reportType == 'betterPlants' && report.betterPlantsReportSetup && report.betterPlantsReportSetup.includePerformanceTable == undefined) {
      isChanged = true;
      report.betterPlantsReportSetup.includePerformanceTable = true;
    }

    if (report.reportType == 'betterClimate' && report.betterClimateReportSetup) {
      if (report.betterClimateReportSetup.selectMeterData == undefined) {
        report.betterClimateReportSetup.selectMeterData = false;
        isChanged = true;
      }
      if (report.betterClimateReportSetup.includedFacilityGroups == undefined) {
        let includedFacilityGroups: Array<{
          facilityId: string,
          include: boolean,
          groups: Array<{
            groupId: string,
            include: boolean
          }>
        }> = new Array();

        facilities.forEach(facility => {
          if (facility.accountId == report.accountId) {
            let facilityGroups: Array<{ groupId: string, include: boolean }> = new Array();
            groups.forEach(group => {
              if (group.facilityId == facility.guid) {
                facilityGroups.push({
                  groupId: group.guid,
                  include: true
                });
              }
            });
            includedFacilityGroups.push({
              facilityId: facility.guid,
              include: true,
              groups: facilityGroups
            });
          }
        });
        report.betterClimateReportSetup.includedFacilityGroups = includedFacilityGroups;
        isChanged = true;
      }
    }

    if (report.reportType == 'dataOverview' && report.dataOverviewReportSetup) {
      if (report.dataOverviewReportSetup.includeAllMeterData == undefined) {
        report.dataOverviewReportSetup.includeAllMeterData = true;
        isChanged = true;
      }
      report.dataOverviewReportSetup.includedFacilities.forEach(facility => {
        if (facility.includedGroups == undefined) {
          let facilityGroups: Array<{ groupId: string, include: boolean }> = new Array();
          groups.forEach(group => {
            if (group.facilityId == facility.facilityId) {
              facilityGroups.push({
                groupId: group.guid,
                include: true
              });
            }
          });
          facility.includedGroups = facilityGroups;
          isChanged = true;
        }
      });
    }


    return {
      report: report,
      isChanged: isChanged
    }
  }
}
