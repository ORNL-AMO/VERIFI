import { EmissionsResults } from "../eGridEmissions"
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbUtilityMeter } from "./utilityMeter";
import * as _ from 'lodash';

export interface IdbUtilityMeterData extends Partial<EmissionsResults>, IdbEntry {
    //keys (id primary)
    id?: number,
    guid: string,
    meterId: string,
    facilityId: string,
    accountId: string,
    //data
    readDate: Date,
    dbDate?: Date,
    totalVolume?: number,
    totalEnergyUse: number,
    totalCost: number,
    commodityCharge?: number,
    deliveryCharge?: number,
    checked: boolean,
    meterNumber?: string,
    totalImportConsumption?: number

    //TODO: Check emissions usage for meters...
    isEstimated?: boolean,

    //electricity
    totalRealDemand?: number,
    totalBilledDemand?: number,
    nonEnergyCharge?: number,
    block1Consumption?: number,
    block1ConsumptionCharge?: number,
    block2Consumption?: number,
    block2ConsumptionCharge?: number,
    block3Consumption?: number,
    block3ConsumptionCharge?: number,
    otherConsumption?: number,
    otherConsumptionCharge?: number,
    onPeakAmount?: number,
    onPeakCharge?: number,
    offPeakAmount?: number,
    offPeakCharge?: number,
    transmissionAndDeliveryCharge?: number,
    powerFactor?: number,
    powerFactorCharge?: number,
    localSalesTax?: number,
    stateSalesTax?: number,
    latePayment?: number,
    otherCharge?: number
    //non-electricity
    demandUsage?: number,
    demandCharge?: number,

    heatCapacity?: number,
    vehicleFuelEfficiency?: number,

    isBillConnected?: boolean

}

export function getNewIdbUtilityMeterData(meter: IdbUtilityMeter, accountMeterData: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let lastMeterDate: Date = getLastMeterReadingDate(meter, accountMeterData);
    let newDate: Date = new Date();
    if (lastMeterDate) {
        newDate = new Date(lastMeterDate);
        newDate.setMonth(newDate.getMonth() + 1);
    }
    let idbEntry: IdbEntry = getNewIdbEntry();

    return {
        ...idbEntry,
        meterId: meter.guid,
        facilityId: meter.facilityId,
        accountId: meter.accountId,
        readDate: newDate,
        totalVolume: undefined,
        totalEnergyUse: undefined,
        totalCost: undefined,
        commodityCharge: undefined,
        deliveryCharge: undefined,
        checked: false,
        // Electricity Use Only
        totalRealDemand: undefined,
        totalBilledDemand: undefined,
        nonEnergyCharge: undefined,
        block1Consumption: undefined,
        block1ConsumptionCharge: undefined,
        block2Consumption: undefined,
        block2ConsumptionCharge: undefined,
        block3Consumption: undefined,
        block3ConsumptionCharge: undefined,
        otherConsumption: undefined,
        otherConsumptionCharge: undefined,
        onPeakAmount: undefined,
        onPeakCharge: undefined,
        offPeakAmount: undefined,
        offPeakCharge: undefined,
        transmissionAndDeliveryCharge: undefined,
        powerFactor: undefined,
        powerFactorCharge: undefined,
        localSalesTax: undefined,
        stateSalesTax: undefined,
        latePayment: undefined,
        otherCharge: undefined,
        //non-electricity
        demandUsage: undefined,
        demandCharge: undefined,
        meterNumber: meter.meterNumber,
        heatCapacity: meter.heatCapacity,
        vehicleFuelEfficiency: meter.vehicleFuelEfficiency,
        isBillConnected: false
    }
}

export function getLastMeterReadingDate(meter: IdbUtilityMeter, accountMeterData: Array<IdbUtilityMeterData>): Date {
    let allSelectedMeterData: Array<IdbUtilityMeterData> = getMeterDataFromMeterId(meter.guid, accountMeterData);
    if (allSelectedMeterData.length != 0) {
        let lastMeterReading: IdbUtilityMeterData = _.maxBy(allSelectedMeterData, 'readDate');
        return new Date(lastMeterReading.readDate);
    }
    return undefined;
}

export function checkMeterReadingExistForDate(date: Date, meter: IdbUtilityMeter, accountMeterData: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let newDate: Date = new Date(date);
    if (newDate) {
        let allSelectedMeterData: Array<IdbUtilityMeterData> = getMeterDataFromMeterId(meter.guid, accountMeterData);
        let existingData: IdbUtilityMeterData = allSelectedMeterData.find(dataItem => {
            if (dataItem) {
                return checkSameDate(newDate, dataItem);
            }
            return false;
        });
        return existingData;
    }
    return undefined;
}

export function checkSameDate(date: Date, dataItem: IdbUtilityMeterData): boolean {
    let dataItemDate: Date = new Date(dataItem.readDate);
    return (dataItemDate.getUTCMonth() == date.getUTCMonth()) && (dataItemDate.getUTCFullYear() == date.getUTCFullYear()) && (dataItemDate.getUTCDate() == date.getUTCDate());
}

export function getMeterDataFromMeterId(meterId: string, accountMeterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    return accountMeterData.filter(meterData => { return meterData.meterId == meterId });
}