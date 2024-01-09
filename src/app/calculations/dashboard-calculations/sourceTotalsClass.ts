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
    constructor(calanderizedMeters: Array<CalanderizedMeter>) {
        this.electricity = this.setTotal(calanderizedMeters, 'Electricity');
        this.naturalGas = this.setTotal(calanderizedMeters, 'Natural Gas');
        this.otherFuels = this.setTotal(calanderizedMeters, 'Other Fuels');
        this.otherEnergy = this.setTotal(calanderizedMeters, 'Other Energy');
        this.waterIntake = this.setTotal(calanderizedMeters, 'Water Intake');
        this.waterDischarge = this.setTotal(calanderizedMeters, 'Water Discharge');
        this.other = this.setTotal(calanderizedMeters, 'Other');
    }

    setTotal(calanderizedMeters: Array<CalanderizedMeter>, source: MeterSource): SourceTotal {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == source;
        });
        let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(sMeter => {
            return sMeter.monthlyData;
        });
        return {
            sourceLabel: source,
            energyUse: _.sumBy(monthlyData, (mData: MonthlyData) => {
                return mData.energyUse
            }),
            cost: _.sumBy(monthlyData, (mData: MonthlyData) => {
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