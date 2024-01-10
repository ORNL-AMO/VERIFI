import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { MeterSource } from "src/app/models/constantsAndTypes";
import * as _ from 'lodash';

export class SourceTotals {

    electricity: SourceTotal;
    naturalGas: SourceTotal;
    otherFuels: SourceTotal;
    otherEnergy: SourceTotal;
    waterIntake: SourceTotal;
    waterDischarge: SourceTotal;
    other: SourceTotal;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.electricity = this.setTotal(calanderizedMeters, 'Electricity', dateRange);
        this.naturalGas = this.setTotal(calanderizedMeters, 'Natural Gas', dateRange);
        this.otherFuels = this.setTotal(calanderizedMeters, 'Other Fuels', dateRange);
        this.otherEnergy = this.setTotal(calanderizedMeters, 'Other Energy', dateRange);
        this.waterIntake = this.setTotal(calanderizedMeters, 'Water Intake', dateRange);
        this.waterDischarge = this.setTotal(calanderizedMeters, 'Water Discharge', dateRange);
        this.other = this.setTotal(calanderizedMeters, 'Other', dateRange);
    }

    setTotal(calanderizedMeters: Array<CalanderizedMeter>, source: MeterSource, dateRange: { startDate: Date, endDate: Date }): SourceTotal {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == source;
        });
        let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(sMeter => {
            return sMeter.monthlyData;
        });
        let filteredMonthlyData: Array<MonthlyData> = monthlyData.filter(monthlyData => {
            let itemDate: Date = new Date(monthlyData.date);
            if (itemDate >= dateRange.startDate && itemDate <= dateRange.endDate) {
                return monthlyData;
            }
        });
        return {
            sourceLabel: source,
            energyUse: _.sumBy(filteredMonthlyData, (mData: MonthlyData) => {
                return mData.energyUse
            }),
            cost: _.sumBy(filteredMonthlyData, (mData: MonthlyData) => {
                return mData.energyCost
            })
        }
    }
}


export interface SourceTotal {
    sourceLabel: string,
    energyUse: number,
    cost: number
}