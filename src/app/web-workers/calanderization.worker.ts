/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { CalanderizedMeter } from "../models/calanderization";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, 
            data.allMeterData, 
            data.accountOrFacility, 
            data.monthDisplayShort,
            data.calanderizationOptions, 
            data.co2Emissions, 
            data.customFuels,
            data.facilities, 
            data.assessmentReportVersion, 
            data.customGWPs);
        postMessage({
            calanderizedMeters: calanderizedMeters,
            error: false
        });
    } catch (err) {
        console.log(err);
        postMessage({
            calanderizedMeters: undefined,
            error: true
        });
    }
});