import { ChargesTypes, MeterChargeType } from '@data/models/meter-charges-options';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from '@shared/dateHelperFunctions';

export type BillInspectionCorrelationMetric = 'consumption' | 'totalCost' | 'demand';

export interface BillInspectionReadingRow {
  readonly reading: IdbUtilityMeterData;
  readonly date: Date;
  readonly dateLabel: string;
  readonly sortValue: number;
  readonly totalEnergyUse?: number;
  readonly totalCost?: number;
  readonly totalCostLabel: string;
  readonly demand?: number;
  readonly demandKind?: 'Billed Demand' | 'Real Demand';
}

export interface BillInspectionChargeValue {
  readonly chargeGuid: string;
  readonly amount?: number;
  readonly amountLabel: string;
  readonly usage?: number;
  readonly usageLabel: string;
}

export interface BillInspectionCorrelationPoint {
  readonly readingGuid: string;
  readonly dateLabel: string;
  readonly x: number;
  readonly y: number;
  readonly xLabel: string;
  readonly yLabel: string;
  readonly chargeUsage?: number;
  readonly chargeUsageLabel: string;
  readonly demandKind?: string;
}

export interface BillInspectionRegression {
  readonly intercept: number;
  readonly slope: number;
  readonly rSquared: number;
  readonly label: string;
  readonly lineData: readonly [number, number][];
}

export interface BillInspectionCorrelationPlot {
  readonly id: string;
  readonly metric: BillInspectionCorrelationMetric;
  readonly title: string;
  readonly xLabel: string;
  readonly xUnit?: string;
  readonly xCurrency: boolean;
  readonly points: readonly BillInspectionCorrelationPoint[];
  readonly regression?: BillInspectionRegression;
}

export interface BillInspectionChargeView {
  readonly charge: MeterCharge;
  readonly chargeTypeLabel: string;
  readonly amountCount: number;
  readonly amountTotal: number;
  readonly amountTotalLabel: string;
  readonly valuesByReading: Readonly<Record<string, BillInspectionChargeValue>>;
  readonly plots: readonly BillInspectionCorrelationPlot[];
}

export interface BillInspectionReport {
  readonly meter: IdbUtilityMeter;
  readonly rows: readonly BillInspectionReadingRow[];
  readonly charges: readonly BillInspectionChargeView[];
  readonly hasReadings: boolean;
  readonly hasChargeAmountData: boolean;
  readonly hasTotalCostData: boolean;
}

export function buildBillInspectionReport(
  meter: IdbUtilityMeter,
  readings: readonly IdbUtilityMeterData[]
): BillInspectionReport {
  const rows = readings
    .map(readingToInspectionRow)
    .sort((first, second) => first.sortValue - second.sortValue);
  const charges = (meter.charges ?? []).map(charge => chargeView(meter, rows, charge));

  return {
    meter,
    rows,
    charges,
    hasReadings: rows.length > 0,
    hasChargeAmountData: charges.some(charge => charge.amountCount > 0),
    hasTotalCostData: rows.some(row => isFiniteNumber(row.totalCost))
  };
}

export function formatBillInspectionValue(value: number | undefined, currency: boolean, unit?: string): string {
  if (!isFiniteNumber(value)) {
    return '-';
  }
  if (currency) {
    return formatBillInspectionCurrency(value);
  }
  const suffix = unit ? ` ${unit}` : '';
  return `${formatBillInspectionNumber(value)}${suffix}`;
}

export function formatBillInspectionCurrency(value: number | undefined): string {
  if (!isFiniteNumber(value)) {
    return '-';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatBillInspectionNumber(value: number | undefined): string {
  if (!isFiniteNumber(value)) {
    return '-';
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

export function formatBillInspectionShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function tooltipParamValue(param: unknown): [number, number] | undefined {
  if (typeof param !== 'object' || param === null || !('value' in param)) {
    return undefined;
  }
  const value = (param as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  const x = Number(value[0]);
  const y = Number(value[1]);
  if (value[0] === null || value[0] === undefined || value[1] === null || value[1] === undefined) {
    return undefined;
  }
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
}

export function tooltipParamData(param: unknown): Record<string, unknown> | undefined {
  if (typeof param !== 'object' || param === null || !('data' in param)) {
    return undefined;
  }
  const data = (param as { data?: unknown }).data;
  return typeof data === 'object' && data !== null ? data as Record<string, unknown> : undefined;
}

export function tooltipParamName(param: unknown): string | undefined {
  if (typeof param !== 'object' || param === null || !('name' in param)) {
    return undefined;
  }
  const name = (param as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
}

export function tooltipParamSeriesName(param: unknown): string | undefined {
  if (typeof param !== 'object' || param === null || !('seriesName' in param)) {
    return undefined;
  }
  const seriesName = (param as { seriesName?: unknown }).seriesName;
  return typeof seriesName === 'string' ? seriesName : undefined;
}

export function tooltipParamMarker(param: unknown): string {
  if (typeof param !== 'object' || param === null || !('marker' in param)) {
    return '';
  }
  const marker = (param as { marker?: unknown }).marker;
  return typeof marker === 'string' ? marker : '';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function chargeView(
  meter: IdbUtilityMeter,
  rows: readonly BillInspectionReadingRow[],
  charge: MeterCharge
): BillInspectionChargeView {
  const valuesByReading = valuesForCharge(rows, charge.guid);
  const amountValues = Object.values(valuesByReading)
    .map(value => value.amount)
    .filter(isFiniteNumber);
  const amountTotal = sum(amountValues);
  const plots = buildCorrelationPlots(meter, rows, valuesByReading);
  return {
    charge,
    chargeTypeLabel: chargeTypeLabel(charge.chargeType),
    amountCount: amountValues.length,
    amountTotal,
    amountTotalLabel: formatBillInspectionCurrency(amountTotal),
    valuesByReading,
    plots
  };
}

function readingToInspectionRow(reading: IdbUtilityMeterData): BillInspectionReadingRow {
  const date = getDateFromMeterData(reading);
  const totalCost = finiteOrUndefined(reading.totalCost);
  const billedDemand = finiteOrUndefined(reading.totalBilledDemand);
  const realDemand = finiteOrUndefined(reading.totalRealDemand);
  return {
    reading,
    date,
    dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    sortValue: date.getTime(),
    totalEnergyUse: finiteOrUndefined(reading.totalEnergyUse),
    totalCost,
    totalCostLabel: formatBillInspectionCurrency(totalCost),
    demand: billedDemand ?? realDemand,
    demandKind: billedDemand !== undefined
      ? 'Billed Demand'
      : realDemand !== undefined ? 'Real Demand' : undefined
  };
}

function valuesForCharge(
  rows: readonly BillInspectionReadingRow[],
  chargeGuid: string
): Readonly<Record<string, BillInspectionChargeValue>> {
  return rows.reduce<Record<string, BillInspectionChargeValue>>((values, row) => {
    const chargeData = row.reading.charges?.find(charge => charge.chargeGuid === chargeGuid);
    const amount = finiteOrUndefined(chargeData?.chargeAmount);
    const usage = finiteOrUndefined(chargeData?.chargeUsage);
    values[row.reading.guid] = {
      chargeGuid,
      amount,
      amountLabel: formatBillInspectionCurrency(amount),
      usage,
      usageLabel: formatBillInspectionNumber(usage)
    };
    return values;
  }, {});
}

function buildCorrelationPlots(
  meter: IdbUtilityMeter,
  rows: readonly BillInspectionReadingRow[],
  valuesByReading: Readonly<Record<string, BillInspectionChargeValue>>
): readonly BillInspectionCorrelationPlot[] {
  const energyUnit = meter.energyUnit || 'kWh';
  return [
    correlationPlot('consumption', 'Charge vs Consumption', `Total Consumption (${energyUnit})`, energyUnit, false, rows, valuesByReading),
    correlationPlot('totalCost', 'Charge vs Total Cost', 'Total Cost ($)', undefined, true, rows, valuesByReading),
    correlationPlot('demand', 'Charge vs Demand', `Demand (${meter.demandUnit || 'kW'})`, meter.demandUnit || 'kW', false, rows, valuesByReading)
  ].filter((plot): plot is BillInspectionCorrelationPlot => plot.points.length > 0);
}

function correlationPlot(
  metric: BillInspectionCorrelationMetric,
  title: string,
  xLabel: string,
  xUnit: string | undefined,
  xCurrency: boolean,
  rows: readonly BillInspectionReadingRow[],
  valuesByReading: Readonly<Record<string, BillInspectionChargeValue>>
): BillInspectionCorrelationPlot {
  const points = rows
    .map((row): BillInspectionCorrelationPoint | undefined => {
      const chargeValue = valuesByReading[row.reading.guid];
      const y = chargeValue?.amount;
      const x = correlationXValue(row, metric);
      if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
        return undefined;
      }
      return {
        readingGuid: row.reading.guid,
        dateLabel: row.dateLabel,
        x,
        y,
        xLabel: formatBillInspectionValue(x, xCurrency, xUnit),
        yLabel: formatBillInspectionCurrency(y),
        chargeUsage: chargeValue.usage,
        chargeUsageLabel: chargeValue.usageLabel,
        demandKind: metric === 'demand' ? row.demandKind : undefined
      };
    })
    .filter((point): point is BillInspectionCorrelationPoint => point !== undefined);
  const regression = linearRegression(points, xLabel);

  return {
    id: metric,
    metric,
    title,
    xLabel,
    xUnit,
    xCurrency,
    points,
    regression
  };
}

function correlationXValue(row: BillInspectionReadingRow, metric: BillInspectionCorrelationMetric): number | undefined {
  if (metric === 'totalCost') {
    return row.totalCost;
  }
  if (metric === 'demand') {
    return row.demand;
  }
  return row.totalEnergyUse;
}

function linearRegression(
  points: readonly BillInspectionCorrelationPoint[],
  xLabel: string
): BillInspectionRegression | undefined {
  if (points.length < 3) {
    return undefined;
  }
  const xValues = points.map(point => point.x);
  const yValues = points.map(point => point.y);
  const uniqueXValues = new Set(xValues);
  if (uniqueXValues.size < 2) {
    return undefined;
  }

  const xMean = sum(xValues) / points.length;
  const yMean = sum(yValues) / points.length;
  const slopeNumerator = sum(points.map(point => (point.x - xMean) * (point.y - yMean)));
  const slopeDenominator = sum(points.map(point => (point.x - xMean) ** 2));
  if (!Number.isFinite(slopeDenominator) || slopeDenominator === 0) {
    return undefined;
  }

  const slope = slopeNumerator / slopeDenominator;
  const intercept = yMean - (slope * xMean);
  const totalSquares = sum(yValues.map(value => (value - yMean) ** 2));
  const residualSquares = sum(points.map(point => (point.y - (intercept + slope * point.x)) ** 2));
  const rSquared = totalSquares === 0 ? 1 : 1 - (residualSquares / totalSquares);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);

  return {
    intercept,
    slope,
    rSquared,
    label: `${formatSignificant(intercept)} + (${formatSignificant(slope)} * ${xLabel})`,
    lineData: [
      [xMin, intercept + (slope * xMin)],
      [xMax, intercept + (slope * xMax)]
    ]
  };
}

function formatSignificant(value: number): string {
  return value.toLocaleString(undefined, { maximumSignificantDigits: 5 });
}

function chargeTypeLabel(chargeType: MeterChargeType): string {
  return ChargesTypes.find(type => type.value === chargeType)?.label ?? chargeType;
}

function finiteOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function sum(values: readonly (number | undefined)[]): number {
  return values.reduce((total, value) => total + (isFiniteNumber(value) ? value : 0), 0);
}
