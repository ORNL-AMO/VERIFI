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
            if (showSiteToSource && (accountOrFacility.energyIsSource || energyIsSource) && energyIsSource != false) {
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
        if (meter.scope != 2) {
            for (let index: number = 0; index < copyMeterData.length; index++) {
                copyMeterData[index].totalVolume = new ConvertValue(copyMeterData[index].totalVolume, startingUnit, facilityUnit).convertedValue;
            }
        } else if (meter.vehicleCollectionType == 1) {
            for (let index: number = 0; index < copyMeterData.length; index++) {
                copyMeterData[index].totalVolume = new ConvertValue(copyMeterData[index].totalVolume, startingUnit, facilityUnit).convertedValue;
            }
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
    return { ...meterData }
}