import { CalanderizedMeter } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { isMeterInvalid } from "src/app/shared/validation/meterValidation";

export class MeterStatusCheck {

    meterId: string;
    meterName: string;
    isMeterValid: boolean;
    lastDateEntry: Date;
    hasDuplicateEntries: boolean;
    duplicateEntryDates: Array<Date>;
    status: 'good' | 'warning' | 'error';
    constructor(calanderizedMeter: CalanderizedMeter, meterReadings: Array<IdbUtilityMeterData>) {
        this.meterId = calanderizedMeter.meter.guid;
        this.meterName = calanderizedMeter.meter.name;
        this.isMeterValid = isMeterInvalid(calanderizedMeter.meter) == false;
        let meterReadingsForMeter: Array<IdbUtilityMeterData> = meterReadings.filter(reading => reading.meterId === this.meterId);
        this.setLastDateEntry(meterReadingsForMeter);
        this.setHasDuplicateEntries(meterReadingsForMeter);
        this.setStatus();
    }

    private setLastDateEntry(meterReadings: Array<IdbUtilityMeterData>) {
        if (meterReadings && meterReadings.length > 0) {
            let lastEntry: IdbUtilityMeterData = _.maxBy(meterReadings, (data: IdbUtilityMeterData) => new Date(data.year, data.month - 1, data.day));
            this.lastDateEntry = new Date(lastEntry.year, lastEntry.month - 1, lastEntry.day);
        }
    }

    private setHasDuplicateEntries(meterReadings: Array<IdbUtilityMeterData>) {
        let dayMonthYearCounts: {
            [key: string]: number;
        } = {};
        meterReadings.forEach(reading => {
            let key = `${reading.month}-${reading.year}-${reading.day}`;
            if (dayMonthYearCounts[key]) {
                dayMonthYearCounts[key] += 1;
            } else {
                dayMonthYearCounts[key] = 1;
            }
        });
        this.hasDuplicateEntries = _.some(dayMonthYearCounts, count => count > 1);
        this.duplicateEntryDates = Object.keys(dayMonthYearCounts)
            .filter(key => dayMonthYearCounts[key] > 1)
            .map(key => {
                const [month, year, day] = key.split('-').map(Number);
                return new Date(year, month - 1, day);
            });
    }

    private setStatus() {
        if (!this.isMeterValid) {
            this.status = 'error';
        } else if (this.hasDuplicateEntries) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }
}