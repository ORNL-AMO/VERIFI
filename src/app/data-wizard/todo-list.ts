import { formatDate } from "@angular/common";
import { IdbAccount } from "../models/idbModels/account";
import { IdbFacility } from "../models/idbModels/facility";
import { IdbPredictor } from "../models/idbModels/predictor";
import { IdbPredictorData } from "../models/idbModels/predictorData";
import { IdbUtilityMeter } from "../models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "../models/idbModels/utilityMeterData";
import * as _ from 'lodash';

export function getTodoList(account: IdbAccount,
    facilities: Array<IdbFacility>,
    meters: Array<IdbUtilityMeter>,
    predictors: Array<IdbPredictor>,
    meterData: Array<IdbUtilityMeterData>,
    predictorData: Array<IdbPredictorData>,
    options: TodoListOptions): Array<TodoItem> {
    let toDoItems: Array<TodoItem> = [];
    if (account && facilities && meters && predictors && meterData && predictorData && options) {
        if (account.name == 'New Account') {
            toDoItems.push({
                label: 'Setup account settings',
                url: '/data-wizard/' + account.guid + '/account-setup',
                description: "Set the account name, unit settings, location and sustainability goals. This will help you manage your data effectively.",
                facilityId: undefined,
                type: 'account'
            })
        }

        if (facilities.length === 0) {
            toDoItems.push({
                label: 'Upload data',
                url: '/data-wizard/' + account.guid + '/import-data',
                description: "Upload data to the account. Facility, utility and predictor data can be imported from an excel template provided by VERIFI or from a variety of excel files.",
                facilityId: undefined,
                type: 'account'
            });
            toDoItems.push({
                label: 'Add data manually',
                url: '/data-wizard/' + account.guid + '/facilities',
                description: "Create one or more facilities for this account manually. Once a facility is created, you can add utility meters and predictors to it.",
                facilityId: undefined,
                type: 'account'
            });
        } else {
            facilities.forEach(facility => {
                setFacilityTodoItems(facility, meters, predictors, meterData, predictorData, toDoItems, options);
            });
        }
    }
    return toDoItems;
}


function setFacilityTodoItems(facility: IdbFacility, meters: Array<IdbUtilityMeter>,
    predictors: Array<IdbPredictor>,
    meterData: Array<IdbUtilityMeterData>,
    predictorData: Array<IdbPredictorData>,
    toDoItems: Array<TodoItem>,
    options: TodoListOptions) {
    let facilityMeters: Array<IdbUtilityMeter> = meters.filter(m => m.facilityId === facility.guid);
    if (facilityMeters.length === 0) {
        toDoItems.push({
            label: 'Add utility meters for ' + facility.name,
            url: '/data-wizard/' + facility.accountId + '/facilities/' + facility.guid + '/meters',
            description: "Add utility meters to the facility. Utility meters are used to track energy, water, and other resource usage.",
            facilityId: facility.guid,
            type: 'meter'
        });
    } else {
        facilityMeters.forEach(meter => {
            setMeterTodoItems(meter, meterData, toDoItems, options);
        })
    }
    let facilityPredictors: Array<IdbPredictor> = predictors.filter(p => p.facilityId === facility.guid);
    if (facilityPredictors.length === 0) {
        toDoItems.push({
            label: 'Add predictors for ' + facility.name,
            url: '/data-wizard/' + facility.accountId + '/facilities/' + facility.guid + '/predictors',
            description: "Add predictors to the facility. Predictors are used to analyze and forecast resource usage based on various factors.",
            facilityId: facility.guid,
            type: 'predictor'
        });
    } else {
        facilityPredictors.forEach(predictor => {
            setPredictorTodoItems(predictor, predictorData, toDoItems, options);
        });
    }

}

function setMeterTodoItems(meter: IdbUtilityMeter,
    meterData: Array<IdbUtilityMeterData>,
    toDoItems: Array<TodoItem>,
    options: TodoListOptions) {
    let meterDataForMeter: Array<IdbUtilityMeterData> = meterData.filter(d => d.meterId === meter.guid);
    if (meterDataForMeter.length === 0) {
        toDoItems.push({
            label: 'Add utility meter data for ' + meter.name,
            url: '/data-wizard/' + meter.accountId + '/facilities/' + meter.facilityId + '/meters/' + meter.guid + '/meter-data',
            description: "Add utility meter data for the meter. This data is used to analyze resource usage and trends.",
            facilityId: meter.facilityId,
            type: 'meter'
        });
    } else if (options.includeOutdatedMeters) {
        let latestReading: IdbUtilityMeterData = _.maxBy(meterDataForMeter, (data: IdbUtilityMeterData) => new Date(data.readDate).getTime());
        let readingDate: Date = new Date(latestReading.readDate);

        if (latestReading && readingDate.getTime() < (new Date().getTime() - options.outdatedDays * 24 * 60 * 60 * 1000) && meter.meterReadingDataApplication != 'fullYear') {
            const formattedDate = formatDate(readingDate, 'MM/dd/yyyy', 'en-US');
            toDoItems.push({
                label: 'Update utility meter data for ' + meter.name,
                url: '/data-wizard/' + meter.accountId + '/facilities/' + meter.facilityId + '/meters/' + meter.guid + '/meter-data',
                description: "Update utility meter data for the meter. The latest reading (" + formattedDate + ") is more than " + options.outdatedDays + " days old.",
                facilityId: meter.facilityId,
                type: 'meter',
            });
        }
    }
}

function setPredictorTodoItems(predictor: IdbPredictor,
    predictorData: Array<IdbPredictorData>,
    toDoItems: Array<TodoItem>,
    options: TodoListOptions) {
    let predictorDataForFacility: Array<IdbPredictorData> = predictorData.filter(d => d.predictorId === predictor.guid);
    if (predictorDataForFacility.length === 0) {
        toDoItems.push({
            label: 'Add predictor data for ' + predictor.name,
            url: '/data-wizard/' + predictor.accountId + '/facilities/' + predictor.facilityId + '/predictors/' + predictor.guid + '/predictor-data',
            description: "Add predictor data for the predictor. This data is used to analyze and forecast resource usage based on various factors.",
            facilityId: predictor.facilityId,
            type: 'predictor',
            isWeather: predictor.predictorType == 'Weather'
        });
    } else if (options.includeOutdatedPredictors) {
        let latestReading: IdbPredictorData = _.maxBy(predictorDataForFacility, (data: IdbPredictorData) => new Date(data.date).getTime());
        let readingDate: Date = new Date(latestReading.date);
        // Set readingDate to end of the month
        readingDate = new Date(readingDate.getFullYear(), readingDate.getMonth() + 1, 0);
        //
        // Check if the latest reading is more than 60 days old
        if (latestReading && readingDate.getTime() < (new Date().getTime() - options.outdatedDays * 24 * 60 * 60 * 1000)) {
            const formattedDate = formatDate(readingDate, 'MM/yyyy', 'en-US');
            toDoItems.push({
                label: 'Update predictor data for ' + predictor.name,
                url: '/data-wizard/' + predictor.accountId + '/facilities/' + predictor.facilityId + '/predictors/' + predictor.guid + '/predictor-data',
                description: "Update predictor data for the predictor. The latest reading (" + formattedDate + ") is more than " + options.outdatedDays + " days old.",
                facilityId: predictor.facilityId,
                type: 'predictor',
                isWeather: predictor.predictorType == 'Weather'
            });
        }
    }
}


export interface TodoItem {
    label: string;
    url: string;
    description: string;
    facilityId: string,
    type: 'account' | 'facility' | 'meter' | 'predictor';
    isWeather?: boolean
}

export interface TodoListOptions {
    includeOutdatedMeters: boolean;
    includeOutdatedPredictors: boolean;
    outdatedDays: number;
}