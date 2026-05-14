import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import * as _ from 'lodash';
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { isMeterInvalid } from "src/app/shared/validation/meterValidation";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";

export class MeterStatusCheck {

    meterId: string;
    groupId: string;
    meterName: string;
    isMeterValid: boolean;
    lastDateEntry: Date;
    hasDuplicateEntries: boolean;
    duplicateEntryDates: Array<Date>;
    hasNoData: boolean;
    hasNoCalendarizationMethod: boolean;
    hasNegativeReadings: boolean;
    isDataCurrent: boolean;
    status: STATUS_CHECK_OPTIONS;
    actions: Array<StatusCheckAction>;
    latestFacilityEntryDate: Date;

    constructor(
        meter: IdbUtilityMeter,
        meterReadings: Array<IdbUtilityMeterData>,
        calanderizedMeter: CalanderizedMeter | undefined,
        facilityLatestEntry: { month: number; year: number } | undefined
    ) {
        this.meterId = meter.guid;
        this.groupId = meter.groupId;
        this.meterName = meter.name;
        this.hasNoData = meterReadings.length === 0;
        this.hasNoCalendarizationMethod = !meter.meterReadingDataApplication;
        this.setHasNegativeReadings(meterReadings);
        this.latestFacilityEntryDate = facilityLatestEntry ? new Date(facilityLatestEntry.year, facilityLatestEntry.month - 1) : undefined;
        if (calanderizedMeter) {
            this.isMeterValid = isMeterInvalid(calanderizedMeter.meter) == false;
            this.setLastDateEntry(meterReadings);
            this.setHasDuplicateEntries(meterReadings);
        } else {
            this.isMeterValid = true;
            this.hasDuplicateEntries = false;
            this.duplicateEntryDates = [];
        }
        this.isDataCurrent = this.computeIsDataCurrent(facilityLatestEntry);
        this.setStatus();
        this.setActions(meter, facilityLatestEntry);
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
        if (meterReadings.length === 0) {
            this.hasDuplicateEntries = false;
            this.duplicateEntryDates = [];
            return;
        }
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

    private computeIsDataCurrent(facilityLatestEntry: { month: number; year: number } | undefined): boolean {
        if (this.hasNoData || !facilityLatestEntry || !this.lastDateEntry) return false;
        const entryYear = this.lastDateEntry.getFullYear();
        const entryMonth = this.lastDateEntry.getMonth() + 1;
        return entryYear > facilityLatestEntry.year ||
            (entryYear === facilityLatestEntry.year && entryMonth >= facilityLatestEntry.month);
    }

    private setStatus() {
        if (!this.isMeterValid || this.hasNoData || this.hasDuplicateEntries) {
            this.status = 'error';
        } else if (this.hasNoCalendarizationMethod || !this.isDataCurrent || this.hasNegativeReadings) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }

    private setActions(meter: IdbUtilityMeter, facilityLatestEntry: { month: number; year: number } | undefined) {
        this.actions = [];
        const baseUrl = `/data-management/${meter.accountId}/facilities/${meter.facilityId}/meters/${meter.guid}`;

        if (this.isMeterValid === false) {
            this.actions.push({
                label: 'Edit ' + meter.name,
                url: baseUrl,
                description: 'This meter has configuration errors that need to be resolved before data can be properly assessed.',
                facilityId: meter.facilityId,
                type: 'meter',
                status: 'error',
                trackGuid: meter.guid + '_edit'
            });
        } else if (this.hasNoData) {
            this.actions.push({
                label: 'Add meter data for ' + meter.name,
                url: baseUrl + '/meter-data',
                description: 'No data has been entered for this meter.',
                facilityId: meter.facilityId,
                type: 'meter',
                status: 'error',
                trackGuid: meter.guid + '_add'
            });
        } else {
            if (this.hasNoCalendarizationMethod) {
                this.actions.push({
                    label: 'Set calendarization method for ' + meter.name,
                    url: baseUrl + '/meter-monthly-data',
                    description: 'A calendarization method is required to properly assign energy use to calendar months.',
                    facilityId: meter.facilityId,
                    type: 'meter',
                    status: 'warning',
                    trackGuid: meter.guid + '_calendarization'
                });
            }
            if(this.hasDuplicateEntries){
                this.actions.push({
                    label: 'Resolve duplicate entries for ' + meter.name,
                    url: baseUrl + '/meter-data',
                    description: 'This meter has duplicate data entries for the following dates: ' + this.duplicateEntryDates.map(d => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })).join(', '),
                    facilityId: meter.facilityId,
                    type: 'meter',
                    status: 'error',
                    trackGuid: meter.guid + '_duplicates'
                });
            }
            if (!this.isDataCurrent && facilityLatestEntry && this.lastDateEntry) {
                const latestLabel = this.monthLabel(facilityLatestEntry.month, facilityLatestEntry.year);

                const dataLabel = this.monthLabel(this.lastDateEntry.getMonth() + 1, this.lastDateEntry.getFullYear());
                this.actions.push({
                    label: 'Update meter data for ' + meter.name,
                    url: baseUrl + '/meter-data',
                    description: `Facility data runs through ${latestLabel} but this meter has data through ${dataLabel}.`,
                    facilityId: meter.facilityId,
                    type: 'meter',
                    status: 'warning',
                    trackGuid: meter.guid + '_update'
                });
            }
        }
    }

    private monthLabel(month: number, year: number): string {
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    private setHasNegativeReadings(meterReadings: Array<IdbUtilityMeterData>) {
        this.hasNegativeReadings = meterReadings.some(reading => reading.totalEnergyUse < 0 || (reading.totalVolume !== undefined && reading.totalVolume < 0));
    }
}