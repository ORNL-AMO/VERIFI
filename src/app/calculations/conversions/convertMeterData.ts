import { MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { checkShowSiteToSource, getIsEnergyMeter } from "src/app/shared/sharedHelperFuntions";
import { getUnitFromMeter } from "../calanderization/calanderizationHelpers";
import { ConvertValue } from "./convertValue";

export function convertMeterData(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, accountOrFacility: IdbFacility | IdbAccount, energyIsSource?: boolean): Array<IdbUtilityMeterData> {
    let copyMeterData: Array<IdbUtilityMeterData> = meterData.map(data => { return getMeterDataCopy(data) });
    let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
    if (isEnergyMeter) {
        let showSiteToSource: boolean = checkShowSiteToSource(meter.source, meter.includeInEnergy);
        for (let index: number = 0; index < copyMeterData.length; index++) {
            if (showSiteToSource && (accountOrFacility.energyIsSource || energyIsSource)) {
                copyMeterData[index].totalEnergyUse = copyMeterData[index].totalEnergyUse * meter.siteToSource;
            }
            copyMeterData[index].totalEnergyUse = new ConvertValue(copyMeterData[index].totalEnergyUse, meter.energyUnit, accountOrFacility.energyUnit).convertedValue;
            // this.convertUnitsService.value(meterData[index].totalEnergyUse).from(meter.energyUnit).to(accountOrFacility.energyUnit);
        }
    } else {
        let facilityUnit: string = getUnitFromMeter(meter, accountOrFacility);
        for (let index: number = 0; index < copyMeterData.length; index++) {
            copyMeterData[index].totalVolume = new ConvertValue(copyMeterData[index].totalVolume, meter.startingUnit, facilityUnit).convertedValue;
            // this.convertUnitsService.value(meterData[index].totalVolume).from(meter.startingUnit).to(facilityUnit);
        }
    }
    return copyMeterData;
}

// export function convertMeterDataToAccount(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, account: IdbAccount): Array<IdbUtilityMeterData> {
//     let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
//     if (isEnergyMeter) {
//         for (let index: number = 0; index < meterData.length; index++) {
//             meterData[index].totalEnergyUse = this.convertUnitsService.value(meterData[index].totalEnergyUse).from(meter.energyUnit).to(account.energyUnit);
//         }
//     } else {
//         let accountUnit: string = this.energyUnitsHelperService.getAccountUnitFromMeter(meter);
//         for (let index: number = 0; index < meterData.length; index++) {
//             meterData[index].totalVolume = this.convertUnitsService.value(meterData[index].totalVolume).from(meter.startingUnit).to(accountUnit);
//         }
//     }
//     return meterData;
// }

export function applySiteToSourceMultiplier(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let showSiteToSource: boolean = checkShowSiteToSource(meter.source, meter.includeInEnergy);
    if (showSiteToSource && meter.siteToSource) {
        for (let index = 0; index < meterData.length; index++) {
            meterData[index].totalEnergyUse = meterData[index].totalEnergyUse * meter.siteToSource;
        }
    }
    return meterData;
}


// export function convertMeterDataToAnalysis(analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem, meterData: Array<MonthlyData>, accountOrFacility: IdbFacility | IdbAccount, meter: IdbUtilityMeter): Array<MonthlyData> {
//     if (analysisItem.analysisCategory == 'energy') {
//         let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
//         if (isEnergyMeter) {
//             if (accountOrFacility.energyUnit != analysisItem.energyUnit) {
//                 for (let index: number = 0; index < meterData.length; index++) {
//                     meterData[index].energyUse = this.convertUnitsService.value(meterData[index].energyUse).from(accountOrFacility.energyUnit).to(analysisItem.energyUnit);
//                 }
//             }
//         }
//     } else if (analysisItem.analysisCategory == 'water') {
//         if (accountOrFacility.volumeLiquidUnit != analysisItem.waterUnit) {
//             for (let index: number = 0; index < meterData.length; index++) {
//                 meterData[index].energyConsumption = this.convertUnitsService.value(meterData[index].energyConsumption).from(accountOrFacility.volumeLiquidUnit).to(analysisItem.waterUnit);
//             }
//         }
//     }
//     return meterData;
// }

export function getMeterDataCopy(meterData: IdbUtilityMeterData): IdbUtilityMeterData {
    return {
        //keys (id primary)
        id: meterData.id,
        guid: meterData.guid,
        meterId: meterData.meterId,
        facilityId: meterData.facilityId,
        accountId: meterData.accountId,
        //data
        readDate: meterData.readDate,
        dbDate: meterData.dbDate,
        totalVolume: meterData.totalVolume,
        totalEnergyUse: meterData.totalEnergyUse,
        totalCost: meterData.totalCost,
        commodityCharge: meterData.commodityCharge,
        deliveryCharge: meterData.deliveryCharge,
        checked: meterData.checked,
        meterNumber: meterData.meterNumber,
        totalImportConsumption: meterData.totalImportConsumption,
        totalMarketEmissions: meterData.totalMarketEmissions,
        totalLocationEmissions: meterData.totalLocationEmissions,
        RECs: meterData.RECs,
        excessRECs: meterData.excessRECs,
        excessRECsEmissions: meterData.excessRECsEmissions,
        isEstimated: meterData.isEstimated,


        //electricity
        totalRealDemand: meterData.totalRealDemand,
        totalBilledDemand: meterData.totalBilledDemand,
        nonEnergyCharge: meterData.nonEnergyCharge,
        block1Consumption: meterData.block1Consumption,
        block1ConsumptionCharge: meterData.block1ConsumptionCharge,
        block2Consumption: meterData.block2Consumption,
        block2ConsumptionCharge: meterData.block2ConsumptionCharge,
        block3Consumption: meterData.block3Consumption,
        block3ConsumptionCharge: meterData.block3ConsumptionCharge,
        otherConsumption: meterData.otherConsumption,
        otherConsumptionCharge: meterData.otherConsumptionCharge,
        onPeakAmount: meterData.onPeakAmount,
        onPeakCharge: meterData.onPeakCharge,
        offPeakAmount: meterData.offPeakAmount,
        offPeakCharge: meterData.offPeakCharge,
        transmissionAndDeliveryCharge: meterData.transmissionAndDeliveryCharge,
        powerFactor: meterData.powerFactor,
        powerFactorCharge: meterData.powerFactorCharge,
        localSalesTax: meterData.localSalesTax,
        stateSalesTax: meterData.stateSalesTax,
        latePayment: meterData.latePayment,
        otherCharge: meterData.otherCharge,
        //non-electricity
        demandUsage: meterData.demandUsage,
        demandCharge: meterData.demandCharge
    }
}