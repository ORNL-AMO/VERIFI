import { formatDate } from "@angular/common";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import * as _ from 'lodash';
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { isMeterInvalid } from "src/app/shared/validation/meterValidation";
import { StatusCheckAction } from "./statusCheckModels";

export class MeterStatusCheck {

    meterId: string;
    meterName: string;
    isMeterValid: boolean;
    lastDateEntry: Date;
    hasDuplicateEntries: boolean;
    duplicateEntryDates: Array<Date>;
    status: 'good' | 'warning' | 'error';
    actions: Array<StatusCheckAction>;

    constructor(meter: IdbUtilityMeter, meterReadings: Array<IdbUtilityMeterData>, calanderizedMeter: CalanderizedMeter | undefined, outdatedDays: number) {
        this.meterId = meter.guid;
        this.meterName = meter.name;
        if (calanderizedMeter) {
            this.isMeterValid = isMeterInvalid(calanderizedMeter.meter) == false;
            this.setLastDateEntry(meterReadings);
            this.setHasDuplicateEntries(meterReadings);
        } else {
            this.isMeterValid = true;
            this.hasDuplicateEntries = false;
            this.duplicateEntryDates = [];
        }
        this.setStatus();
        this.setActions(meter, meterReadings, outdatedDays);
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

    private setActions(meter: IdbUtilityMeter, meterReadings: Array<IdbUtilityMeterData>, outdatedDays: number) {
        this.actions = [];
        const baseUrl = `/data-management/${meter.accountId}/facilities/${meter.facilityId}/meters/${meter.guid}`;
        if (meterReadings.length === 0) {
            this.actions.push({
                label: 'Add utility meter data for ' + meter.name,
                url: baseUrl + '/meter-data',
                description: 'Add utility meter data for the meter. This data is used to analyze resource usage and trends.',
                facilityId: meter.facilityId,
                type: 'meter',
                trackGuid: meter.guid + '_add'
            });
        } else {
            if (!meter.meterReadingDataApplication) {
                this.actions.push({
                    label: 'Set calendarization method for ' + meter.name,
                    url: baseUrl + '/meter-monthly-data',
                    description: 'Select the method with which to calendarize the meter data for this meter. Calendarization is the process of properly applying the correct amount of energy use to a month.',
                    facilityId: meter.facilityId,
                    type: 'meter',
                    trackGuid: meter.guid + '_calendarization'
                });
            }
            if (this.lastDateEntry) {
                const outdatedMs = outdatedDays * 24 * 60 * 60 * 1000;
                if (this.lastDateEntry.getTime() < (new Date().getTime() - outdatedMs) && meter.meterReadingDataApplication !== 'fullYear') {
                    const formattedDate = formatDate(this.lastDateEntry, 'MM/dd/yyyy', 'en-US');
                    this.actions.push({
                        label: 'Update utility meter data for ' + meter.name,
                        url: baseUrl + '/meter-data',
                        description: `Update utility meter data for the meter. The latest reading (${formattedDate}) is more than ${outdatedDays} days old.`,
                        facilityId: meter.facilityId,
                        type: 'meter',
                        trackGuid: meter.guid + '_update'
                    });
                }
            }
        }
    }
}