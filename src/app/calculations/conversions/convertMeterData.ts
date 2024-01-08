import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { checkShowSiteToSource, getIsEnergyMeter, getIsEnergyUnit } from "src/app/shared/sharedHelperFuntions";
import { getUnitFromMeter } from "../calanderization/calanderizationHelpers";
import { ConvertValue } from "./convertValue";

export function convertMeterData(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, accountOrFacility: IdbFacility | IdbAccount, energyIsSource?: boolean, neededUnit?: string): Array<IdbUtilityMeterData> {
    let copyMeterData: Array<IdbUtilityMeterData> = meterData.map(data => { return getMeterDataCopy(data) });
    let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
    if (isEnergyMeter) {
        let showSiteToSource: boolean = checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope);
        for (let index: number = 0; index < copyMeterData.length; index++) {
            if (showSiteToSource && (accountOrFacility.energyIsSource || energyIsSource)) {
                copyMeterData[index].totalEnergyUse = copyMeterData[index].totalEnergyUse * meter.siteToSource;
            }
            if (!neededUnit) {
                copyMeterData[index].totalEnergyUse = new ConvertValue(copyMeterData[index].totalEnergyUse, meter.energyUnit, accountOrFacility.energyUnit).convertedValue;
            } else {
                copyMeterData[index].totalEnergyUse = new ConvertValue(copyMeterData[index].totalEnergyUse, meter.energyUnit, neededUnit).convertedValue;
            }
        }
    }
    let needConvertVolume: boolean = copyMeterData.find(mData => { return mData.totalVolume != undefined }) != undefined;
    if (needConvertVolume) {
        //TODO: Check correct units are being used where needed...
        let facilityUnit: string;
        if (neededUnit && !getIsEnergyUnit(neededUnit)) {
            facilityUnit = neededUnit;
        }
        if (!facilityUnit) {
            facilityUnit = getUnitFromMeter(meter, accountOrFacility);
        }
        let startingUnit: string = meter.startingUnit;
        if (meter.source == 'Other Fuels' && meter.scope == 2) {
            startingUnit = meter.vehicleCollectionUnit;
        }
        for (let index: number = 0; index < copyMeterData.length; index++) {
            copyMeterData[index].totalVolume = new ConvertValue(copyMeterData[index].totalVolume, startingUnit, facilityUnit).convertedValue;
        }
    }
    return copyMeterData;
}


export function applySiteToSourceMultiplier(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let showSiteToSource: boolean = checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope);
    if (showSiteToSource && meter.siteToSource) {
        for (let index = 0; index < meterData.length; index++) {
            meterData[index].totalEnergyUse = meterData[index].totalEnergyUse * meter.siteToSource;
        }
    }
    return meterData;
}

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