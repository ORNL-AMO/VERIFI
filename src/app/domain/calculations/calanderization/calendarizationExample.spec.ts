import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import {
    buildCalendarizationExample,
    buildCalendarizationReferenceExample,
    buildCalendarizationSummaries
} from './calendarizationExample';

describe('calendarization example helpers', () => {
    it('builds full-month summaries and colored calendar markers', () => {
        const example = buildCalendarizationExample(
            meter({ meterReadingDataApplication: 'fullMonth' }),
            [
                reading({ guid: 'jan', month: 1, day: 15, totalEnergyUse: 100 }),
                reading({ guid: 'feb', month: 2, day: 15, totalEnergyUse: 200 }),
                reading({ guid: 'mar', month: 3, day: 15, totalEnergyUse: 300 })
            ]
        );

        expect(example.canShowLiveExample).toBe(true);
        expect(example.summaries[0].calanderizedMonth).toEqual(new Date(2026, 1, 1));
        expect(example.summaries[0].monthReadingSummaries[0]).toMatchObject({
            daysInBill: 28,
            daysApplied: 28,
            totalEnergyFromBill: 200
        });
        expect(example.displayMonths[0].days.find(day => day.day === 15)?.readingIndex).toBe(0);
        expect(example.displayMonths[1].days.find(day => day.day === 1)?.allocationIndex).toBe(1);
    });

    it('builds backward allocation summaries from three readings', () => {
        const summaries = buildCalendarizationSummaries(
            meter({ meterReadingDataApplication: 'backward' }),
            [
                reading({ guid: 'jan', month: 1, day: 15, totalEnergyUse: 100 }),
                reading({ guid: 'feb', month: 2, day: 15, totalEnergyUse: 200 }),
                reading({ guid: 'mar', month: 3, day: 15, totalEnergyUse: 300 })
            ],
            'backward'
        );

        expect(summaries.length).toBeGreaterThan(0);
        expect(summaries[0].monthReadingSummaries).toHaveLength(2);
        expect(summaries[0].monthReadingSummaries[0].readDate).toEqual(new Date(2026, 1, 15));
        expect(summaries[0].monthReadingSummaries[0].readingIndex).toBe(1);
        expect(summaries[0].monthReadingSummaries[1].readingIndex).toBe(2);
        expect(summaries[0].totalEnergyUse).toBeGreaterThan(0);
    });

    it('handles annual distribution and missing live-example data without summaries', () => {
        const fullYearExample = buildCalendarizationExample(
            meter({ meterReadingDataApplication: 'fullYear' }),
            [
                reading({ guid: 'jan', month: 1, day: 1 }),
                reading({ guid: 'feb', month: 2, day: 1 }),
                reading({ guid: 'mar', month: 3, day: 1 })
            ]
        );
        const tooFewReadingsExample = buildCalendarizationExample(
            meter({ meterReadingDataApplication: 'backward' }),
            [reading({ guid: 'jan', month: 1, day: 1 }), reading({ guid: 'feb', month: 2, day: 1 })]
        );

        expect(fullYearExample.canShowLiveExample).toBe(false);
        expect(fullYearExample.summaries).toEqual([]);
        expect(tooFewReadingsExample.canShowLiveExample).toBe(false);
        expect(tooFewReadingsExample.summaries).toEqual([]);
    });

    it('marks same-month readings distinctly in the calendar view', () => {
        const example = buildCalendarizationExample(
            meter({ meterReadingDataApplication: 'backward' }),
            [
                reading({ guid: 'jan-a', month: 1, day: 5 }),
                reading({ guid: 'jan-b', month: 1, day: 20 }),
                reading({ guid: 'feb', month: 2, day: 15 })
            ]
        );

        const januaryDays = example.displayMonths[0].days;
        expect(januaryDays.find(day => day.day === 5)?.readingIndex).toBe(0);
        expect(januaryDays.find(day => day.day === 20)?.readingIndex).toBe(1);
    });

    it('builds the v0-style four-month reference calendar', () => {
        const example = buildCalendarizationReferenceExample();

        expect(example.displayMonths.map(month => month.label)).toEqual([
            'December 2021',
            'January 2022',
            'February 2022',
            'March 2022'
        ]);
        expect(example.readingMarkers.map(marker => marker.label)).toEqual([
            'Dec 3, 2021',
            'Jan 2, 2022',
            'Feb 4, 2022',
            'Mar 4, 2022'
        ]);
        expect(example.displayMonths[0].days.find(day => day.day === 3)?.readingIndex).toBe(0);
        expect(example.displayMonths[1].days.find(day => day.day === 2)?.readingIndex).toBe(1);
        expect(example.displayMonths[2].days.find(day => day.day === 4)?.readingIndex).toBe(2);
        expect(example.displayMonths[3].days.find(day => day.day === 4)?.readingIndex).toBe(3);
        expect(example.displayMonths[3].days.find(day => day.day === 5)?.allocationIndex).toBeUndefined();
    });
});

function meter(options: Partial<IdbUtilityMeter> = {}): IdbUtilityMeter {
    return {
        guid: 'meter-a',
        accountId: 'account-a',
        facilityId: 'facility-a',
        groupId: undefined,
        source: 'Electricity',
        startingUnit: 'kWh',
        energyUnit: 'kWh',
        scope: 3,
        meterReadingDataApplication: 'backward',
        ...options
    } as IdbUtilityMeter;
}

function reading(options: Partial<IdbUtilityMeterData> = {}): IdbUtilityMeterData {
    return {
        guid: 'reading-a',
        meterId: 'meter-a',
        accountId: 'account-a',
        facilityId: 'facility-a',
        day: 1,
        month: 1,
        year: 2026,
        totalEnergyUse: 120,
        totalVolume: 120,
        totalCost: 20,
        ...options
    } as IdbUtilityMeterData;
}
