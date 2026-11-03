import { FormControl, FormGroup } from '@angular/forms';
import { AnalysisTableColumns } from '@data/models/analysis';
import { AnalysisReportSettings, getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';
import { getAnalysisReportDefaults } from './analysis-report-defaults';
export { COLUMN_OPTIONS, ColumnKey } from './analysis-report-columns';

export type SectionKey = Exclude<keyof AnalysisReportSettings, 'reportYear' | 'analysisTableColumns'>;
export const SECTION_OPTIONS: readonly { key: SectionKey; label: string; parent?: SectionKey }[] = [
  { key: 'facilityAnnualResults', label: 'Facility annual results' },
  { key: 'facilityAnnualResultsTable', label: 'Annual table', parent: 'facilityAnnualResults' },
  { key: 'facilityAnnualResultsGraphs', label: 'Annual charts', parent: 'facilityAnnualResults' },
  { key: 'facilityMonthlyResults', label: 'Facility monthly results' },
  { key: 'facilityMonthlyResultsTable', label: 'Monthly tables', parent: 'facilityMonthlyResults' },
  { key: 'facilityMonthlyResultsTableBaselineYear', label: 'Baseline year', parent: 'facilityMonthlyResultsTable' },
  { key: 'facilityMonthlyResultsTableReportYear', label: 'Report year', parent: 'facilityMonthlyResultsTable' },
  { key: 'facilityMonthlyResultsGraphs', label: 'Monthly charts', parent: 'facilityMonthlyResults' },
  { key: 'facilityGroupContributions', label: 'Facility group contributions' },
  { key: 'facilityGroupContributionsTable', label: 'Contributions table', parent: 'facilityGroupContributions' },
  { key: 'facilityGroupContributionsGraphs', label: 'Contributions heatmap', parent: 'facilityGroupContributions' },
  { key: 'groupReports', label: 'Group reports' },
  { key: 'groupModelDetails', label: 'Regression model details', parent: 'groupReports' },
  { key: 'groupAnnualResults', label: 'Group annual results', parent: 'groupReports' },
  { key: 'groupAnnualResultsTable', label: 'Annual table', parent: 'groupAnnualResults' },
  { key: 'groupAnnualResultsGraphs', label: 'Annual charts', parent: 'groupAnnualResults' },
  { key: 'groupMonthlyResults', label: 'Group monthly results', parent: 'groupReports' },
  { key: 'groupMonthlyResultsTable', label: 'Monthly tables', parent: 'groupMonthlyResults' },
  { key: 'groupMonthlyResultsTableBaselineYear', label: 'Baseline year', parent: 'groupMonthlyResultsTable' },
  { key: 'groupMonthlyResultsTableReportYear', label: 'Report year', parent: 'groupMonthlyResultsTable' },
  { key: 'groupMonthlyResultsTableModelYear', label: 'Model year', parent: 'groupMonthlyResultsTable' },
  { key: 'groupMonthlyResultsGraphs', label: 'Monthly charts', parent: 'groupMonthlyResults' }
];
export type SettingsDraft = Required<Omit<AnalysisReportSettings, 'reportYear'>> & { reportYear: number | null };
export type SettingsControls = { [K in SectionKey]: FormControl<boolean> } & {
  reportYear: FormControl<number | null>;
  analysisTableColumns: FormGroup<{ [K in keyof AnalysisTableColumns]: FormControl<AnalysisTableColumns[K]> }>;
};
export function settingsDraft(settings?: AnalysisReportSettings): SettingsDraft {
  // Older saved records retain their original fallback behavior as well as explicit choices.
  const defaults = settings ? getAnalysisReportSettings() : getAnalysisReportDefaults();
  return structuredClone({ ...defaults, ...settings, reportYear: settings?.reportYear ?? null,
    facilityGroupContributions: settings?.facilityGroupContributions ?? false,
    facilityGroupContributionsTable: settings?.facilityGroupContributionsTable ?? true,
    facilityGroupContributionsGraphs: settings?.facilityGroupContributionsGraphs ?? true,
    analysisTableColumns: { ...defaults.analysisTableColumns, ...settings?.analysisTableColumns, predictorGroupId: settings?.analysisTableColumns?.predictorGroupId ?? undefined } });
}
export function settingsForm(): FormGroup<SettingsControls> {
  const defaults = getAnalysisReportDefaults();
  const controls = Object.fromEntries(SECTION_OPTIONS.map(item => [item.key, new FormControl<boolean>(defaults[item.key] ?? false, { nonNullable: true })])) as { [K in SectionKey]: FormControl<boolean> };
  const columns = Object.fromEntries(Object.entries(defaults.analysisTableColumns).map(([key, value]) => [key, new FormControl(value, { nonNullable: true })])) as { [K in keyof AnalysisTableColumns]: FormControl<AnalysisTableColumns[K]> };
  return new FormGroup({ ...controls, reportYear: new FormControl<number | null>(null),
    analysisTableColumns: new FormGroup(columns) } as SettingsControls);
}
