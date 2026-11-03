import { SectionKey } from '../analysis-report-settings';

interface ContentRow {
  readonly key: SectionKey;
  readonly label: string;
  readonly table?: SectionKey;
  readonly charts?: SectionKey;
  readonly usesResultColumns: boolean;
  readonly periods: readonly { key: SectionKey; label: string }[];
}
export const REPORT_CONTENT_GROUPS: readonly {
  id: string; label: string; key?: SectionKey; rows: readonly ContentRow[];
}[] = [
  { id: 'facility', label: 'Facility results', rows: [
    { key: 'facilityAnnualResults', label: 'Annual results', table: 'facilityAnnualResultsTable', charts: 'facilityAnnualResultsGraphs', usesResultColumns: true, periods: [] },
    { key: 'facilityMonthlyResults', label: 'Monthly results', table: 'facilityMonthlyResultsTable', charts: 'facilityMonthlyResultsGraphs', usesResultColumns: true, periods: [
      { key: 'facilityMonthlyResultsTableBaselineYear', label: 'Baseline' }, { key: 'facilityMonthlyResultsTableReportYear', label: 'Report' }
    ] },
    { key: 'facilityGroupContributions', label: 'Group contributions', table: 'facilityGroupContributionsTable', charts: 'facilityGroupContributionsGraphs', usesResultColumns: false, periods: [] }
  ] },
  { id: 'groups', label: 'Group reports', key: 'groupReports', rows: [
    { key: 'groupModelDetails', label: 'Regression model details', usesResultColumns: false, periods: [] },
    { key: 'groupAnnualResults', label: 'Annual results', table: 'groupAnnualResultsTable', charts: 'groupAnnualResultsGraphs', usesResultColumns: true, periods: [] },
    { key: 'groupMonthlyResults', label: 'Monthly results', table: 'groupMonthlyResultsTable', charts: 'groupMonthlyResultsGraphs', usesResultColumns: true, periods: [
      { key: 'groupMonthlyResultsTableBaselineYear', label: 'Baseline' }, { key: 'groupMonthlyResultsTableReportYear', label: 'Report' },
      { key: 'groupMonthlyResultsTableModelYear', label: 'Model' }
    ] }
  ] }
];

export const REPORT_CONTENT_PRESETS = [
  { id: 'annual', label: 'Facility Annual Summary', sections: ['facilityAnnualResults'] },
  { id: 'annual-groups', label: 'Facility+Groups Annual Summary', sections: ['facilityAnnualResults', 'facilityGroupContributions', 'groupAnnualResults'] },
  { id: 'facility', label: 'Facility Detail', sections: ['facilityAnnualResults', 'facilityMonthlyResults'] },
  { id: 'facility-groups', label: 'Facility+Groups Detail', sections: ['facilityAnnualResults', 'facilityMonthlyResults', 'facilityGroupContributions', 'groupAnnualResults', 'groupMonthlyResults'] },
  { id: 'full', label: 'Full Analysis', sections: REPORT_CONTENT_GROUPS.flatMap(group => group.rows.map(row => row.key)) }
] as const satisfies readonly { id: string; label: string; sections: readonly SectionKey[] }[];

export type ReportContentPreset = typeof REPORT_CONTENT_PRESETS[number];
type ContentSettings = Record<SectionKey, boolean>;

/** Patch content only; hidden child choices, year, columns and predictor GUIDs survive. */
export function reportContentPresetChanges(preset: ReportContentPreset): Partial<ContentSettings> {
  const included = new Set<SectionKey>(preset.sections);
  const changes: Partial<ContentSettings> = {};
  for (const group of REPORT_CONTENT_GROUPS) {
    if (group.key) changes[group.key] = group.rows.some(row => included.has(row.key));
    for (const row of group.rows) {
      changes[row.key] = included.has(row.key);
      if (!changes[row.key]) continue;
      if (row.table) changes[row.table] = true;
      if (row.charts) changes[row.charts] = true;
      for (const period of row.periods) changes[period.key] = true;
    }
  }
  return changes;
}

export function matchingReportContentPreset(settings: ContentSettings): ReportContentPreset | undefined {
  return REPORT_CONTENT_PRESETS.find(preset => {
    const included = new Set<SectionKey>(preset.sections);
    return REPORT_CONTENT_GROUPS.every(group => group.rows.every(row => {
      const enabled = (!group.key || settings[group.key]) && settings[row.key];
      return enabled === included.has(row.key) && (!enabled || ((!row.table || settings[row.table])
        && (!row.charts || settings[row.charts]) && row.periods.every(period => settings[period.key])));
    }));
  });
}
