import { getIsEnergyMeter, getIsEnergyUnit } from "src/app/shared/sharedHelperFuntions";
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
    checked: boolean,
    meterNumber?: string,
    totalImportConsumption?: number
    //electricity
    totalRealDemand?: number,
    totalBilledDemand?: number,

    //TODO: Check emissions usage for meters...
    isEstimated?: boolean,


    heatCapacity?: number,
    vehicleFuelEfficiency?: number,

    isBillConnected?: boolean,
    uploadedFilePath?: string

    charges?: Array<MeterDataCharge>,

    //DEPRECATED fields no longer used
    commodityCharge?: number,
    deliveryCharge?: number,
    //electricity
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
        isBillConnected: false,
        uploadedFilePath: undefined,
        charges: meter.charges ? meter.charges.map(charge => {
            return {
                chargeGuid: charge.guid,
                chargeAmount: 0,
                chargeUsage: 0
            };
        }) : [],
        isEstimated: false
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

export function updateMeterDataCharges(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>,): Array<IdbUtilityMeterData> {

    let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
    let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);

    let dataNeedsUpdate: Array<IdbUtilityMeterData> = [];
    let chargesGuids: Array<string> = meter.charges ? meter.charges.map(charge => charge.guid) : [];
    meterData.forEach(dataItem => {
        let addToUpdateArr: boolean = false;
        if (isEnergyMeter && !isEnergyUnit) {
            let newEnergyUse: number = dataItem.totalVolume * meter.heatCapacity;
            if (newEnergyUse !== dataItem.totalEnergyUse) {
                dataItem.totalEnergyUse = newEnergyUse;
                addToUpdateArr = true;
            }
        }

        if (dataItem.charges) {
            let currentChargesGuids: Array<string> = dataItem.charges.map(charge => charge.chargeGuid);
            let newCharges: Array<MeterDataCharge> = [];
            // Add new charges that are in the meter but not in the data item
            chargesGuids.forEach(chargeGuid => {
                if (!currentChargesGuids.includes(chargeGuid)) {
                    newCharges.push({
                        chargeGuid: chargeGuid,
                        chargeAmount: 0,
                        chargeUsage: 0
                    });
                    addToUpdateArr = true;
                }
            });
            // Remove charges that are in the data item but not in the meter
            currentChargesGuids.forEach(chargeGuid => {
                if (!chargesGuids.includes(chargeGuid)) {
                    dataItem.charges = dataItem.charges.filter(charge => charge.chargeGuid != chargeGuid);
                    addToUpdateArr = true;
                }
            });
            if (addToUpdateArr) {
                dataItem.charges = [...dataItem.charges, ...newCharges];
                dataNeedsUpdate.push(dataItem);
            }
        } else {
            dataItem.charges = meter.charges ? meter.charges.map(charge => {
                return {
                    chargeGuid: charge.guid,
                    chargeAmount: 0,
                    chargeUsage: 0
                };
            }) : [];
            dataNeedsUpdate.push(dataItem);
        }
    })
    return dataNeedsUpdate;
}


export interface MeterDataCharge {
    chargeGuid: string,
    chargeAmount: number,
    chargeUsage: number
}