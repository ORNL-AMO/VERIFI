import { IdbUtilityMeter, MeterReadingDataApplication } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from '@shared/dateHelperFunctions';
import { getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import {
    daysBetweenDates,
    getCurrentMonthsReadings,
    getNextMonthsBill,
    getPreviousMonthsBill
} from './calanderizationHelpers';

export interface CalendarizationExample {
    readonly method?: MeterReadingDataApplication;
    readonly orderedReadings: readonly IdbUtilityMeterData[];
    readonly canShowLiveExample: boolean;
    readonly displayMonths: readonly CalendarizationExampleMonth[];
    readonly readingMarkers: readonly CalendarizationExampleReadingMarker[];
    readonly summaries: readonly CalendarizationExampleSummaryItem[];
}

export interface CalendarizationReferenceExample {
    readonly displayMonths: readonly CalendarizationExampleMonth[];
    readonly readingMarkers: readonly CalendarizationExampleReadingMarker[];
}

export interface CalendarizationExampleMonth {
    readonly monthKey: string;
    readonly label: string;
    readonly leadingBlankDays: readonly number[];
    readonly days: readonly CalendarizationExampleDay[];
}

export interface CalendarizationExampleDay {
    readonly dateKey: string;
    readonly day: number;
    readonly readingIndex?: number;
    readonly allocationIndex?: number;
    readonly label: string;
}

export interface CalendarizationExampleReadingMarker {
    readonly index: number;
    readonly readDate: Date;
    readonly label: string;
}

export interface CalendarizationExampleSummaryItem {
    readonly calanderizedMonth: Date;
    readonly monthReadingSummaries: readonly CalendarizationExampleReadingSummary[];
    readonly totalEnergyUse: number;
}

export interface CalendarizationExampleReadingSummary {
    readonly readDate: Date;
    readonly readingIndex?: number;
    readonly daysInBill: number;
    readonly energyUsePerDay: number;
    readonly daysApplied: number;
    readonly totalEnergyFromBill: number;
}

export function buildCalendarizationExample(
    meter: IdbUtilityMeter,
    meterData: readonly IdbUtilityMeterData[]
): CalendarizationExample {
    const orderedReadings = [...meterData]
        .sort((first, second) => getDateFromMeterData(first).getTime() - getDateFromMeterData(second).getTime());
    const method = meter.meterReadingDataApplication;
    const canShowLiveExample = orderedReadings.length >= 3 && method !== undefined && method !== 'fullYear';

    return {
        method,
        orderedReadings,
        canShowLiveExample,
        displayMonths: buildCalendarMonths(orderedReadings, method),
        readingMarkers: buildReadingMarkers(orderedReadings),
        summaries: canShowLiveExample
            ? buildCalendarizationSummaries(meter, orderedReadings, method)
            : []
    };
}

export function buildCalendarizationSummaries(
    meter: IdbUtilityMeter,
    meterData: readonly IdbUtilityMeterData[],
    method: MeterReadingDataApplication = meter.meterReadingDataApplication ?? 'fullMonth'
): CalendarizationExampleSummaryItem[] {
    if (method === 'fullYear') {
        return [];
    }
    if (method === 'backward') {
        return buildBackwardsSummaries(meterData);
    }
    return buildFullMonthSummaries(meter, meterData);
}

export function buildCalendarizationReferenceExample(): CalendarizationReferenceExample {
    const readingDates = [
        new Date(2021, 11, 3),
        new Date(2022, 0, 2),
        new Date(2022, 1, 4),
        new Date(2022, 2, 4)
    ];
    return {
        displayMonths: Array.from({ length: 4 }, (_value, index) => {
            const monthDate = new Date(2021, 11 + index, 1);
            return {
                monthKey: monthKey(monthDate),
                label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                leadingBlankDays: Array.from({ length: monthDate.getDay() }, (_blank, blankIndex) => blankIndex),
                days: buildMonthDays(monthDate, readingDates, 'backward')
            };
        }),
        readingMarkers: buildReadingMarkersFromDates(readingDates)
    };
}

function buildCalendarMonths(
    readings: readonly IdbUtilityMeterData[],
    method?: MeterReadingDataApplication
): CalendarizationExampleMonth[] {
    if (readings.length === 0) {
        return [];
    }
    const firstReadingDate = getDateFromMeterData(readings[0]);
    const readingDates = readings.slice(0, 4).map(reading => getDateFromMeterData(reading));
    const displayMonthCount = Math.min(Math.max(readings.length, 3), 4);
    return Array.from({ length: displayMonthCount }, (_value, index) => {
        const monthDate = new Date(firstReadingDate.getFullYear(), firstReadingDate.getMonth() + index, 1);
        return {
            monthKey: monthKey(monthDate),
            label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            leadingBlankDays: Array.from({ length: monthDate.getDay() }, (_value, blankIndex) => blankIndex),
            days: buildMonthDays(monthDate, readingDates, method)
        };
    });
}

function buildMonthDays(
    monthDate: Date,
    readingDates: readonly Date[],
    method?: MeterReadingDataApplication
): CalendarizationExampleDay[] {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_value, index) => {
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1);
        const readingIndex = readingDates.findIndex(readingDate => isSameDay(readingDate, date));
        const dayAllocationIndex = allocationIndex(date, readingDates, method);
        return {
            dateKey: dateKey(date),
            day: date.getDate(),
            readingIndex: readingIndex >= 0 ? readingIndex : undefined,
            allocationIndex: dayAllocationIndex,
            label: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        };
    });
}

function buildReadingMarkers(readings: readonly IdbUtilityMeterData[]): CalendarizationExampleReadingMarker[] {
    return buildReadingMarkersFromDates(readings.slice(0, 4).map(reading => getDateFromMeterData(reading)));
}

function buildReadingMarkersFromDates(readingDates: readonly Date[]): CalendarizationExampleReadingMarker[] {
    return readingDates.map((readDate, index) => {
        return {
            index,
            readDate,
            label: readDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
    });
}

function allocationIndex(
    date: Date,
    readingDates: readonly Date[],
    method?: MeterReadingDataApplication
): number | undefined {
    if (method === 'fullYear' || readingDates.length === 0) {
        return undefined;
    }
    if (method === 'backward') {
        const index = readingDates.findIndex(readingDate => date.getTime() <= readingDate.getTime());
        return index >= 0 ? index : undefined;
    }
    const index = readingDates.findIndex(readingDate => isSameMonth(readingDate, date));
    return index >= 0 ? index : undefined;
}

function buildBackwardsSummaries(meterData: readonly IdbUtilityMeterData[]): CalendarizationExampleSummaryItem[] {
    const calanderizationSummary: CalendarizationExampleSummaryItem[] = [];
    const orderedMeterData = [...meterData]
        .sort((first, second) => getDateFromMeterData(first).getTime() - getDateFromMeterData(second).getTime());
    if (orderedMeterData.length <= 2) {
        return calanderizationSummary;
    }

    const startDate = getDateFromMeterData(orderedMeterData[0]);
    startDate.setMonth(startDate.getMonth() + 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
    while (startDate < endDate) {
        const month = startDate.getMonth();
        const year = startDate.getFullYear();
        let previousMonthReading = getPreviousMonthsBill(month, year, orderedMeterData);
        const currentMonthsReadings = getCurrentMonthsReadings(month, year, orderedMeterData);
        const nextMonthsReading = getNextMonthsBill(month, year, orderedMeterData);
        if (nextMonthsReading) {
            if (currentMonthsReadings.length === 1) {
                calanderizationSummary.push(getCalanderizationSummaryItem(
                    previousMonthReading,
                    currentMonthsReadings[0],
                    nextMonthsReading,
                    year,
                    month,
                    orderedMeterData
                ));
            } else if (currentMonthsReadings.length > 1) {
                const summaryItem: CalendarizationExampleSummaryItem = {
                    calanderizedMonth: new Date(year, month),
                    monthReadingSummaries: [],
                    totalEnergyUse: 0
                };
                let monthReadingSummaries: CalendarizationExampleReadingSummary[] = [];
                for (let readingIndex = 0; readingIndex < currentMonthsReadings.length; readingIndex++) {
                    let currentMonthReading: IdbUtilityMeterData;
                    let nextReading: IdbUtilityMeterData;
                    if (readingIndex === 0) {
                        currentMonthReading = currentMonthsReadings[readingIndex];
                        nextReading = currentMonthsReadings[readingIndex + 1];
                    } else if (readingIndex === currentMonthsReadings.length - 1) {
                        previousMonthReading = currentMonthsReadings[readingIndex - 1];
                        currentMonthReading = currentMonthsReadings[readingIndex];
                        nextReading = nextMonthsReading;
                    } else {
                        previousMonthReading = currentMonthsReadings[readingIndex - 1];
                        currentMonthReading = currentMonthsReadings[readingIndex];
                        nextReading = currentMonthsReadings[readingIndex + 1];
                    }
                    monthReadingSummaries = monthReadingSummaries.concat(
                        getCalanderizationSummaryItem(previousMonthReading, currentMonthReading, nextReading, year, month, orderedMeterData)
                            .monthReadingSummaries
                    );
                }
                const uniqueSummaries = uniqueReadingSummaries(monthReadingSummaries);
                calanderizationSummary.push({
                    ...summaryItem,
                    monthReadingSummaries: uniqueSummaries,
                    totalEnergyUse: sumBy(uniqueSummaries, summary => summary.totalEnergyFromBill)
                });
            } else {
                const previousBillDate = getDateFromMeterData(previousMonthReading);
                const nextBillDate = getDateFromMeterData(nextMonthsReading);
                const daysBetween = daysBetweenDates(previousBillDate, nextBillDate);
                const energyUsePerDay = nextMonthsReading.totalEnergyUse / daysBetween;
                const currentMonthDate = new Date(year, month);
                const nextMonthDate = new Date(year, month + 1);
                const daysInMonth = daysBetweenDates(currentMonthDate, nextMonthDate);
                const energyUseForMonth = energyUsePerDay * daysInMonth;
                calanderizationSummary.push({
                    calanderizedMonth: new Date(year, month),
                    monthReadingSummaries: [{
                        readDate: getDateFromMeterData(nextMonthsReading),
                        readingIndex: readingIndexForReading(nextMonthsReading, orderedMeterData),
                        daysInBill: daysBetween,
                        energyUsePerDay,
                        daysApplied: daysInMonth,
                        totalEnergyFromBill: energyUseForMonth
                    }],
                    totalEnergyUse: energyUseForMonth
                });
            }
        }
        startDate.setMonth(startDate.getMonth() + 1);
    }
    return calanderizationSummary;
}

function getCalanderizationSummaryItem(
    previousReading: IdbUtilityMeterData,
    currentReading: IdbUtilityMeterData,
    nextReading: IdbUtilityMeterData,
    year: number,
    month: number,
    orderedMeterData: readonly IdbUtilityMeterData[]
): CalendarizationExampleSummaryItem {
    const currentDate = getDateFromMeterData(currentReading);
    const previousReadingDate = getDateFromMeterData(previousReading);
    const daysFromPrevious = daysBetweenDates(previousReadingDate, currentDate);
    const energyUsePerDayCurrent = currentReading.totalEnergyUse / daysFromPrevious;
    let daysFromCurrent = currentDate.getDate();
    if (currentDate.getMonth() === previousReadingDate.getMonth()) {
        daysFromCurrent = currentDate.getDate() - previousReadingDate.getDate();
    }
    const energyUseForCurrent = energyUsePerDayCurrent * daysFromCurrent;

    const nextMonthsDate = getDateFromMeterData(nextReading);
    const daysFromNext = daysBetweenDates(currentDate, nextMonthsDate);
    const energyUsePerDayNext = nextReading.totalEnergyUse / daysFromNext;
    if (nextMonthsDate.getMonth() !== currentDate.getMonth()) {
        nextMonthsDate.setMonth(currentDate.getMonth() + 1);
        nextMonthsDate.setDate(0);
        nextMonthsDate.setFullYear(currentDate.getFullYear());
    }
    const daysTillNext = daysBetweenDates(currentDate, nextMonthsDate);
    const energyUseForMonthNext = energyUsePerDayNext * daysTillNext;

    return {
        calanderizedMonth: new Date(year, month),
        monthReadingSummaries: [
            {
                readDate: getDateFromMeterData(currentReading),
                readingIndex: readingIndexForReading(currentReading, orderedMeterData),
                daysInBill: daysFromPrevious,
                energyUsePerDay: energyUsePerDayCurrent,
                daysApplied: daysFromCurrent,
                totalEnergyFromBill: energyUseForCurrent
            },
            {
                readDate: getDateFromMeterData(nextReading),
                readingIndex: readingIndexForReading(nextReading, orderedMeterData),
                daysInBill: daysFromNext,
                energyUsePerDay: energyUsePerDayNext,
                daysApplied: daysTillNext,
                totalEnergyFromBill: energyUseForMonthNext
            }
        ],
        totalEnergyUse: energyUseForCurrent + energyUseForMonthNext
    };
}

function buildFullMonthSummaries(
    meter: IdbUtilityMeter,
    meterData: readonly IdbUtilityMeterData[]
): CalendarizationExampleSummaryItem[] {
    const calanderizationSummary: CalendarizationExampleSummaryItem[] = [];
    const orderedMeterData = [...meterData]
        .sort((first, second) => getDateFromMeterData(first).getTime() - getDateFromMeterData(second).getTime());
    if (orderedMeterData.length === 0) {
        return calanderizationSummary;
    }

    const startDate = getDateFromMeterData(orderedMeterData[0]);
    startDate.setMonth(startDate.getMonth() + 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
    while (startDate < endDate) {
        const month = startDate.getMonth();
        const year = startDate.getFullYear();
        const monthReadingSummaries: CalendarizationExampleReadingSummary[] = [];
        const currentMonthsReadings = getCurrentMonthsReadings(month, year, orderedMeterData);
        currentMonthsReadings.forEach(reading => {
            let totalMonthEnergyConsumption = 0;
            let totalMonthEnergyUse = 0;

            if (getIsEnergyMeter(meter.source)) {
                totalMonthEnergyUse = reading.totalEnergyUse;
            }
            if (!getIsEnergyUnit(meter.startingUnit)) {
                totalMonthEnergyConsumption = reading.totalVolume;
            } else {
                totalMonthEnergyConsumption = totalMonthEnergyUse;
            }
            const startOfMonth = getDateFromMeterData(reading);
            startOfMonth.setDate(1);
            const nextMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
            const daysInMonth = daysBetweenDates(startOfMonth, nextMonth);
            monthReadingSummaries.push({
                readDate: getDateFromMeterData(reading),
                readingIndex: readingIndexForReading(reading, orderedMeterData),
                energyUsePerDay: totalMonthEnergyConsumption / daysInMonth,
                daysApplied: daysInMonth,
                totalEnergyFromBill: totalMonthEnergyConsumption,
                daysInBill: daysInMonth
            });
        });
        calanderizationSummary.push({
            calanderizedMonth: new Date(year, month),
            monthReadingSummaries,
            totalEnergyUse: sumBy(monthReadingSummaries, summary => summary.totalEnergyFromBill)
        });
        startDate.setMonth(startDate.getMonth() + 1);
    }
    return calanderizationSummary;
}

function uniqueReadingSummaries(summaries: readonly CalendarizationExampleReadingSummary[]): CalendarizationExampleReadingSummary[] {
    const keys = new Set<string>();
    return summaries.filter(summary => {
        const key = [
            summary.readDate.getTime(),
            summary.readingIndex,
            summary.daysInBill,
            summary.energyUsePerDay,
            summary.daysApplied,
            summary.totalEnergyFromBill
        ].join('|');
        if (keys.has(key)) {
            return false;
        }
        keys.add(key);
        return true;
    });
}

function sumBy<T>(items: readonly T[], select: (item: T) => number): number {
    return items.reduce((total, item) => total + (select(item) || 0), 0);
}

function readingIndexForReading(
    reading: IdbUtilityMeterData,
    orderedMeterData: readonly IdbUtilityMeterData[]
): number | undefined {
    const readingDate = getDateFromMeterData(reading);
    const index = orderedMeterData
        .slice(0, 4)
        .findIndex(candidate => isSameDay(getDateFromMeterData(candidate), readingDate));
    return index >= 0 ? index : undefined;
}

function isSameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
        && first.getMonth() === second.getMonth()
        && first.getDate() === second.getDate();
}

function isSameMonth(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
        && first.getMonth() === second.getMonth();
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
