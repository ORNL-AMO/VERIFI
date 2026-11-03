import { formatDate } from '@angular/common';
import { AnalysisGroupPredictorVariable, AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AnalysisResultMarker } from '../result-markers/analysis-result-markers';
import { analysisResultCell, analysisResultColumnsForPeriod, finiteAnalysisResultValue } from '../columns/analysis-result-columns';
import { AnalysisResultsTableColumn, AnalysisResultsTableView } from './analysis-results-table.models';

interface ResultRow {
  readonly row: AnnualAnalysisSummary | MonthlyAnalysisSummaryData;
  readonly markers: readonly AnalysisResultMarker[];
  readonly isFiscalYearEnd?: boolean;
}

/** The Analysis workbench's existing display projection, independent of its route and preferences service. */
export function analysisResultsTableView(rows: readonly ResultRow[], columns: AnalysisTableColumns,
  predictors: readonly AnalysisGroupPredictorVariable[], period: 'annual' | 'monthly', banking: boolean, showModeled = false): AnalysisResultsTableView {
  const selected = analysisResultColumnsForPeriod(period, banking).filter(column => columns[column.id]);
  const use = selected.filter(column => column.section === 'use' && (column.id !== 'modeledEnergy' || showModeled));
  const improvement = selected.filter(column => column.section === 'improvement');
  const variables = columns.productionVariables ? predictors : [];
  const headers: AnalysisResultsTableColumn[] = [
    ...(period === 'monthly' ? [{ id: 'fiscalYear', label: 'Fiscal year', section: 'period' as const }] : []),
    ...use.map(column => ({ id: column.id, label: column.label, section: 'use' as const })),
    ...variables.map(variable => ({ id: `predictor:${variable.id}`, label: variable.name, unit: variable.unit, section: 'predictors' as const })),
    ...improvement.map(column => ({ id: column.id, label: column.label, section: 'improvement' as const }))
  ];
  return { headers, rows: rows.map(view => {
    const annual = view.row as AnnualAnalysisSummary, monthly = view.row as MonthlyAnalysisSummaryData;
    const transition = view.row.isIntermediateBanked || view.markers.includes('transition');
    return { key: period === 'annual' ? String(annual.year) : new Date(monthly.date).toISOString(),
      label: period === 'annual' ? String(annual.year) : formatDate(monthly.date, 'MMM y', 'en-US'),
      markers: view.markers, missing: period === 'annual' ? annual.missingPredictorValue : monthly.missingValueWarning,
      fiscalYearEnd: view.isFiscalYearEnd,
      cells: [
        ...(period === 'monthly' ? [{ value: null, text: String(monthly.fiscalYear) }] : []),
        ...use.map(column => analysisResultCell(view.row, column, transition)),
        ...variables.map(variable => ({ value: finiteAnalysisResultValue(view.row.predictorUsage?.find(item => item.predictorId === variable.id)?.usage) })),
        ...improvement.map(column => analysisResultCell(view.row, column, transition))
      ] };
  }) };
}
