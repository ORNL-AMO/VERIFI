export type PptSlide = TitleSlide | TableSlide | ChartSlide;

export interface TableHeaderCell {
    content: string;
    colspan?: number;
}

export interface TitleSlide {
    type: 'title';
    title: string;
    subtitle?: string;
    date?: string;
    layout?: 'title' | 'titleOnly' | 'section';
}

export interface TableSlide {
    type: 'table';
    title: string;
    headers: Array<string | TableHeaderCell>;
    subHeaders?: Array<string | TableHeaderCell>;
    rows: Array<Array<string | number>>;
    note?: string;
}

export interface ChartSlide {
    type: 'chart';
    title: string;
    chartType: 'bar' | 'line' | 'area' | 'combo';
    labels: Array<string>;
    series: PptChartSeries[];
    yAxisUnit?: string;
    valAxisLabelFormatCode?: string;
    valAxisMinVal?: number;
    valAxisMaxVal?: number;
    valAxisMajorUnit?: number;
    showLegend?: boolean;
    showDataLabels?: boolean;
    lineDash?: 'solid' | 'dash' | 'dot';
    note?: string;
}

export interface PptChartSeries {
    name: string;
    data: Array<number>;
    type?: 'bar' | 'line' | 'area';
    color?: string;
    lineDash?: 'solid' | 'dash' | 'dot' | 'dashDot';
    lineSize?: number;
}

export interface PptAxisSpec {
    min: number;
    max: number;
    majorUnit: number;
    labelFormat: string;
}

export function getPptAxisSpec(values: number[], opts?: { isPercent?: boolean }): PptAxisSpec {
    const valid = values.filter(v => Number.isFinite(v));
    if (!valid.length) {
        return {
            min: 0,
            max: 1,
            majorUnit: 0.2,
            labelFormat: opts?.isPercent ? '0.0"%"' : '0.0'
        };
    }

    const dataMin = Math.min(...valid);
    const dataMax = Math.max(...valid);

    const zeroMin = Math.min(0, dataMin);
    const zeroMax = Math.max(0, dataMax);

    const baseRange = Math.max(
        zeroMax - zeroMin,
        Math.abs(zeroMax || 1),
        Math.abs(zeroMin || 1),
        1e-9
    );

    const targetTickCount = 6;
    const rawStep = baseRange / targetTickCount;
    const majorUnit = getStep(rawStep);

    let min = Math.floor(zeroMin / majorUnit) * majorUnit;
    let max = Math.ceil(zeroMax / majorUnit) * majorUnit;

    if (min > 0) min = 0;
    if (max < 0) max = 0;
    if (max === min) max = min + majorUnit;

    const decimals = getDecimalsForStep(majorUnit);
    const labelFormat = opts?.isPercent
        ? (decimals > 0 ? `0.${'0'.repeat(decimals)}"%"` : '0"%"')
        : (decimals > 0 ? `#,##0.${'0'.repeat(decimals)}` : '#,##0');

    return { min, max, majorUnit, labelFormat };
}

function getStep(rawStep: number): number {
    const step = Math.max(rawStep, 1e-9);
    const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
    const normalized = step / magnitude;

    if (normalized <= 1) return 1 * magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

function getDecimalsForStep(step: number): number {
    if (step >= 1) return 0;
    return Math.min(4, Math.max(1, Math.ceil(-Math.log10(step))));
}