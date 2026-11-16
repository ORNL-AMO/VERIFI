import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { RouteState } from '@app/v1/routing/workspace-route';
import { StatusItem, isDataFinding } from '@app/v1/status/status.models';
import type { WorkspaceInventoryCounts } from '../workspace-context.models';

export type PanelTabId = 'help' | 'todos' | 'results' | 'details';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface PanelTab {
  readonly id: PanelTabId;
  readonly label: string;
  readonly icon: IconName;
}

export interface PanelContent {
  readonly help: ReadonlyArray<string>;
  readonly todos: ReadonlyArray<StatusItem>;
  readonly discardedWarnings: ReadonlyArray<StatusItem>;
  readonly results: ReadonlyArray<{ label: string; value: string; tone: StatusTone }>;
  readonly details: ReadonlyArray<{ label: string; value: string }>;
}

export const SUPPORT_PANEL_TABS: ReadonlyArray<PanelTab> = [
  { id: 'help', label: 'Help', icon: 'help' },
  { id: 'todos', label: 'Todos', icon: 'checklist' },
  { id: 'results', label: 'Results', icon: 'meter' },
  { id: 'details', label: 'Details', icon: 'table' }
];

export interface WorkspacePanelInput {
  readonly account?: { readonly name: string };
  readonly facility?: { readonly guid: string; readonly name: string };
  readonly singleFacility?: { readonly name: string };
  readonly counts: WorkspaceInventoryCounts;
  readonly route: Pick<RouteState, 'section' | 'detail'>;
  readonly activePanelTab: PanelTabId;
  readonly accountTodos: readonly StatusItem[];
  readonly discardedItems: readonly StatusItem[];
}

export function buildWorkspacePanelContent(input: WorkspacePanelInput): PanelContent {
  const account = input.account;
  const facility = input.facility;
  const single = input.singleFacility;
  const isFacility = !!facility;
  const name = single?.name ?? (isFacility ? facility?.name : account?.name);
  const counts = input.counts;
  const isData = input.route.section === 'data';
  const todos = input.accountTodos.filter(item => single || !facility || item.entity.facilityGuid === facility.guid);
  const discardedWarnings = input.discardedItems.filter(item => single || !facility || item.entity.facilityGuid === facility.guid);
  const help = input.route.section === 'visualization' && input.route.detail === 'workbench'
    ? buildVisualizationWorkbenchHelp()
    : single
    ? [`Browse data, analyses, and reports for ${single.name}.`, 'Open an item to work with its saved data and settings.']
    : input.route.section === 'reports'
    ? ['Use Reports to browse, create, copy, rename, and delete saved reports. Account Reports includes reports from every facility.', 'Open a report name to view its saved configuration. Report-specific settings and previews are coming in later migrations.']
    : isFacility && input.route.section === 'data'
    ? buildFacilityDataHelp(input.route.detail)
    : [
      `Browse data, analyses, and reports for ${name || 'the selected account'}.`,
      'Choose a facility in the header to focus inventories and navigation on its records.'
    ];

  return {
    help,
    todos: isData ? todos.filter(isDataFinding) : todos,
    discardedWarnings: isData ? discardedWarnings.filter(isDataFinding) : discardedWarnings,
    results: [
      ...(!single ? [{ label: 'Facilities', value: String(counts.facilities), tone: 'info' as const }] : []),
      { label: 'Meters', value: String(counts.meters), tone: counts.meters > 0 ? 'success' : 'neutral' },
      { label: 'Predictors', value: String(counts.predictors), tone: counts.predictors > 0 ? 'success' : 'neutral' },
      ...(!isData ? [
        { label: 'Analyses', value: String(counts.analyses), tone: counts.analyses > 0 ? 'success' as const : 'neutral' as const },
        { label: 'Reports', value: String(counts.reports), tone: counts.reports > 0 ? 'success' as const : 'neutral' as const }
      ] : [])
    ],
    details: [
      { label: 'Context', value: single ? 'Single-facility workspace' : isFacility ? 'Facility workspace' : 'Account workspace' },
      { label: 'Active section', value: `${input.route.section} / ${input.route.detail}` },
      { label: 'Support tab', value: input.activePanelTab }
    ]
  };
}

function buildVisualizationWorkbenchHelp(): ReadonlyArray<string> {
  return [
    'Add visualization and this workbench follow the same decisions. Open a completed section to inspect or change it; opening alone preserves later choices. Settings save automatically, and the Settings button gives the chart more space.',
    'Changes that clear customized later choices show a confirmation first. Removing an item forgets its styling; adding or retaining other items keeps their choices. Facilities includes All Facilities or a selected subset. All includes future facilities; one selected facility owns the chart, while multiple facilities use account ownership. Double-click a facility card to select only that facility. Removing facilities retains compatible choices and reviews excluded selections. Pinned settings stay fixed; owner-relative units and fiscal periods follow the derived owner.',
    'Each item can use Line or Bar with its own color, label, axis and visibility. The chart can mix both types. The chart-wide Line/Bar control applies to every item; its default also controls new items.',
    'Fixed meters keep exact identities and retired history. Selected groups and facilities keep their identities while their meter membership updates. Missing selected identities require repair.',
    'Calendarized data supports compatible totals by source, meter group or facility. Individual meters retain separate observations. Native bills keep individual observations and actual dates; grouped totals and comparisons are unavailable.',
    'Named charges keep their owning meter and native bill observations. Monthly allocation, cross-meter charge totals, and summed demand are unavailable.',
    'Units and site or source energy can follow the owning account or facility settings, or be pinned. Portfolio periods follow the account calendar; facility periods follow the owning facility. Native observations retain their whole original periods.',
    'Series on the same axis must have compatible units and meaning. Combined source traces follow current meter membership. Individual appearance settings follow resource identity; moving across a source boundary moves that source’s series together.',
    'Chart styling changes presentation without changing source values. Partial coverage and overlap notices identify interpretation limits; unavailable data is not treated as zero. Exact original periods, values and quality remain available to assistive technology.'
  ];
}

function buildFacilityDataHelp(detail: string): ReadonlyArray<string> {
  if (detail === 'meters') {
    return [
      'Use Meters to search facility meters and compare their available monthly energy, water, and cost data.',
      'Open a meter name for its workbench. Use the actions menu for readings, copy, and delete, or Select meters to delete several together.'
    ];
  }
  if (detail === 'meter-grouping') {
    return [
      'Use Meter Grouping to manage groups, drag meter cards between group sections, or use Move meter for keyboard-friendly reassignment.',
      'Open a group to review monthly and yearly result tables or charts. Open a meter card from a group to continue setup, readings, monthly data, yearly data, and quality review in the meter workbench.'
    ];
  }
  return [
    'Facility Data pages organize setup records used by meter analysis, visualization, and reporting workflows.',
    'Use the sidebar to move between meters, meter grouping, predictors, and energy-use setup.'
  ];
}
