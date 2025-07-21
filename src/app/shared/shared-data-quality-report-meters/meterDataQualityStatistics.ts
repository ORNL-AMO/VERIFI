import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";

export interface Statistics {
    min: number;
    max: number;
    average: number;
    median: number;
    medianAbsDev: number;
    medianminus2_5MAD: number;
    medianplus2_5MAD: number;
    outliers: number;
}

export function getStatistics(meterData: Array<IdbUtilityMeterData>, selectedMeter: IdbUtilityMeter): {
    energyStats: Statistics;
    costStats: Statistics;
} {
    let consumptionData: Array<number> = getConsumptionData(meterData, selectedMeter);
    let energyStats: Statistics = calculateStatistics(consumptionData);
    let costData: Array<number> = meterData.map(data => data.totalCost);
    let costStats: Statistics = calculateStatistics(costData);
    return {
        energyStats: energyStats,
        costStats: costStats
    }
}

export function getConsumptionData(meterData: Array<IdbUtilityMeterData>, selectedMeter: IdbUtilityMeter): number[] {
    if (selectedMeter.source === 'Electricity') {
        return meterData.map(data => { return data.totalEnergyUse });
    }
    if (selectedMeter.scope == 5 || selectedMeter.scope == 6) {
        return meterData.map(data => { return data.totalVolume });
    }
    else if (selectedMeter.scope == 2) {
        return meterData.map(data => { return data.totalEnergyUse });
    }
    else {
        const allEnergyInvalid = meterData.every(data =>
            data.totalEnergyUse === 0 ||
            data.totalEnergyUse === undefined ||
            data.totalEnergyUse === null
        );
        if (allEnergyInvalid) {
            return meterData.map(data => data.totalVolume);
        } else {
            return meterData.map(data => data.totalEnergyUse);
        }
    }
}


export function getUnitFromMeter(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): string {
    if (meter.source === 'Electricity') {
        return meter.energyUnit;
    }
    if (meter.scope == 5 || meter.scope == 6) {
        return meter.startingUnit;
    }
    else if (meter.scope == 2) {
        return meter.energyUnit;
    }
    else {
        const allEnergyInvalid = meterData.every(data =>
            data.totalEnergyUse === 0 ||
            data.totalEnergyUse === undefined ||
            data.totalEnergyUse === null
        );
        if (allEnergyInvalid) {
            return meter.startingUnit;
        } else {
            return meter.energyUnit;
        }
    }
}

export function calculateStatistics(data: number[]): Statistics {
    if (!data.length) {
        return { min: NaN, max: NaN, average: NaN, median: NaN, medianAbsDev: NaN, medianminus2_5MAD: NaN, medianplus2_5MAD: NaN, outliers: 0 };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const average = data.reduce((sum, v) => sum + v, 0) / data.length;

    const median = calculateMedian(data);
    const medianAbsDev = calculateMAD(data, median);
    const medianminus2_5MAD = median - 2.5 * medianAbsDev;
    const medianplus2_5MAD = median + 2.5 * medianAbsDev;
    const outliers = calculateOutliers(data, median, medianAbsDev);
    return { min, max, average, median, medianAbsDev, medianminus2_5MAD, medianplus2_5MAD, outliers };

    // const variance = data.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / data.length;
    // const sd = Math.sqrt(variance);
    // const meanMinus3Sd = average - 3 * sd;
    // const meanPlus3Sd = average + 3 * sd;
    // const outliers = data.filter(v => v < meanMinus3Sd || v > meanPlus3Sd).length;
    // return { min, max, average, sd, meanMinus3Sd, meanPlus3Sd, outliers };
}

function calculateMedian(data: number[]): number {
    const sortedData = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sortedData.length / 2);
    if (sortedData.length % 2 === 0) {
        return (sortedData[mid - 1] + sortedData[mid]) / 2;
    } else {
        return sortedData[mid];
    }
}

function calculateMAD(data: number[], median: number): number {
    const absDeviations = data.map(value => Math.abs(value - median));
    return calculateMedian(absDeviations);
}

function calculateOutliers(data: number[], median: number, mad: number): number {
    if (!data || data.length === 0) {
        return 0;
    }

    if (mad === 0) {
        return 0;
    }

    const lowerBound = median - 2.5 * mad;
    const upperBound = median + 2.5 * mad;

    return data.filter(value => value < lowerBound || value > upperBound).length;
}
