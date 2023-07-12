/// <reference lib="webworker" />

import { CalanderizeMetersClass } from "../calculations/calanderization/calanderizeMeters";
import { AccountOverviewData } from "../calculations/dashboard-calculations/accountOverviewClass";
import { UtilityUseAndCost } from "../calculations/dashboard-calculations/useAndCostClass";
import { setEmissionsForCalanderizedMeters } from "../calculations/emissions-calculations/emissions";
import { CalanderizedMeter, MonthlyData } from "../models/calanderization";
import * as _ from 'lodash';
addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = new CalanderizeMetersClass(data.meters, data.meterData, data.account, true, { energyIsSource: data.energyIsSource }).calanderizedMeterData;
        if (data.co2Emissions) {
            //set emissions values
            calanderizedMeters = setEmissionsForCalanderizedMeters(calanderizedMeters, data.energyIsSource, data.facilities, data.co2Emissions);
        }
        let dateRange: { endDate: Date, startDate: Date };
        if (!data.dateRange) {
            if (calanderizedMeters && calanderizedMeters.length > 0) {
                let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(val => { return val.monthlyData });
                let latestData: MonthlyData = _.maxBy(monthlyData, 'date');
                let maxDate: Date;
                let minDate: Date;
                if (data.inOverview) {
                    maxDate = new Date(latestData.year, latestData.monthNumValue);
                    minDate = new Date(maxDate.getUTCFullYear() - 1, maxDate.getMonth(), 1);
                } else {
                    let startData: MonthlyData = _.minBy(monthlyData, 'date');
                    maxDate = new Date(latestData.year, latestData.monthNumValue);
                    minDate = new Date(startData.year, startData.monthNumValue);
                }
                minDate.setMonth(minDate.getMonth() + 1);
                dateRange = {
                    endDate: maxDate,
                    startDate: minDate
                };
            }
        } else {
            dateRange = data.dateRange;
        }
        let accountOverviewData: AccountOverviewData = new AccountOverviewData(calanderizedMeters, data.facilities, data.account, dateRange);
        let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(calanderizedMeters, dateRange);
        let results = {
            accountOverviewData: accountOverviewData,
            utilityUseAndCost: utilityUseAndCost,
            type: data.type,
            error: false,
            dateRange: dateRange,
            calanderizedMeters: calanderizedMeters
        }
        postMessage(results);
    } catch (err) {
        let results = {
            accountOverviewData: undefined,
            utilityUseAndCost: undefined,
            type: data.type,
            error: true
        }
        postMessage(results);
    }
});
