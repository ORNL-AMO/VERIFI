import { AnalysisResultMarker } from '../result-markers/analysis-result-markers';

export type AnalysisResultsTableSection = 'period' | 'use' | 'predictors' | 'improvement';

export interface AnalysisResultsTableColumn {
  readonly id: string;
  readonly label: string;
  readonly section: AnalysisResultsTableSection;
  readonly unit?: string;
}

export interface AnalysisResultsTableCell {
  readonly value: number | null;
  readonly text?: string;
  readonly percent?: boolean;
  readonly missing?: boolean;
}

export interface AnalysisResultsTableRow {
  readonly key: string;
  readonly label: string;
  readonly markers: readonly AnalysisResultMarker[];
  readonly missing?: boolean;
  readonly fiscalYearEnd?: boolean;
  readonly cells: readonly AnalysisResultsTableCell[];
}

/** Presentation only: callers retain ownership of results, column selection, and period scope. */
export interface AnalysisResultsTableView {
  readonly headers: readonly AnalysisResultsTableColumn[];
  readonly rows: readonly AnalysisResultsTableRow[];
}
