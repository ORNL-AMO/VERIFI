import {
  DataQualityAnnualColumn, DataQualityAnnualTotal, DataQualityAnnualTotals
} from '@domain/reports/data-quality-report-annual-totals';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';

const number = new AnalysisResultNumberPipe();

export function dataQualityAnnualColumns(totals: DataQualityAnnualTotals) {
  return totals.columns.map(column => ({ ...column,
    unitHtml: column.unit ? new ConvertValue(undefined, undefined, undefined).getUnit(column.unit)
      ?.unit.name.display.replace('(', '').replace(')', '') : undefined
  }));
}

/** Callers own ordering; formatting does not mutate the supplied annual values. */
export function dataQualityAnnualRows(
  columns: readonly DataQualityAnnualColumn[], rows: readonly DataQualityAnnualTotal[]
) {
  return rows.map(row => ({ year: row.year, cells: columns.map(column => {
    const value = row[column.key];
    const text = column.key === 'year' ? String(value)
      : Number.isFinite(value) ? number.transform(value) : value.toLocaleString();
    return { key: column.key, text: column.key === 'energyCost' ? `$${text}` : text };
  }) }));
}
