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
  const help = single
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
