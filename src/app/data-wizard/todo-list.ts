import { IdbAccount } from "../models/idbModels/account";
import { IdbFacility } from "../models/idbModels/facility";
import { IdbPredictor } from "../models/idbModels/predictor";
import { IdbUtilityMeter } from "../models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "../models/idbModels/utilityMeterData";

export function getTodoList(account: IdbAccount,
    facilities: Array<IdbFacility>,
    meters: Array<IdbUtilityMeter>,
    predictors: Array<IdbPredictor>,
    meterData: Array<IdbUtilityMeterData>): Array<TodoItem> {
    let toDoItems: Array<TodoItem> = [];
    if (account && facilities && meters && predictors && meterData) {
        if (account.name == 'New Account') {
            toDoItems.push({
                label: 'Setup Account Settings',
                url: '/data-wizard/' + account.guid + '/account-setup',
                description: "Set the account with a name, unit settings, location and sustainability goals. This will help you manage your data effectively."
            })
        }

        if (facilities.length === 0) {
            toDoItems.push({
                label: 'Upload Data',
                url: '/data-wizard/' + account.guid + '/import-data',
                description: "Upload data to the account. Facility, utility and predictor data can be imported from an excel template provided by VERIFI or from a variety of excel files."
            });
            toDoItems.push({
                label: 'Add Data Manually',
                url: '/data-wizard/' + account.guid + '/facilities',
                description: "Create one or more facilities for this account manually. Once a facility is created, you can add utility meters and predictors to it."
            });
        } else {
            facilities.forEach(facility => {
                if (meters.filter(m => m.facilityId === facility.guid).length === 0) {
                    toDoItems.push({
                        label: 'Add Utility Meters for ' + facility.name,
                        url: '/data-wizard/' + account.guid + '/facilities/' + facility.guid + '/meters',
                        description: "Add utility meters to the facility. Utility meters are used to track energy, water, and other resource usage."
                    });
                }
                if (predictors.filter(p => p.facilityId === facility.guid).length === 0) {
                    toDoItems.push({
                        label: 'Add Predictors for ' + facility.name,
                        url: '/data-wizard/' + account.guid + '/facilities/' + facility.guid + '/predictors',
                        description: "Add predictors to the facility. Predictors are used to analyze and forecast resource usage based on various factors."
                    });
                }
            });
        }
    }
    return toDoItems;
}


export interface TodoItem {
    label: string;
    url: string;
    description: string;
}