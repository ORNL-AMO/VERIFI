export function getPredictorStatistics(data: number[]): PredictorStatistics {
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

export interface PredictorStatistics {
    min: number;
    max: number;
    average: number;
    median: number;
    medianAbsDev: number;
    medianminus2_5MAD: number;
    medianplus2_5MAD: number;
    outliers: number;
}
