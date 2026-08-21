import { AppStartupState } from 'src/app/application-lifecycle/application-lifecycle.models';
import { AccountWorkspaceSnapshot, WorkspaceError, WorkspaceStatus } from '@data/account-workspace/account-workspace.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import {
  P1AccountSummary,
  P1ContentCard,
  P1ContextMode,
  P1FacilitySummary,
  P1Metric,
  P1NavGroup,
  P1PanelContent,
  P1PrototypeData,
  P1SectionId,
  P1SetupSummary,
  P1SetupTask,
  P1StatusTone,
  P1ViewState,
  P1WorkspaceContent
} from './p1.models';
import { p1Sections, p1WelcomeActions } from './p1-static-content';

export interface P1RealDataInput {
  accounts: readonly IdbAccount[];
  startupState: AppStartupState;
  workspaceStatus: WorkspaceStatus;
  workspaceError?: WorkspaceError;
  snapshot?: AccountWorkspaceSnapshot;
  selectedFacilityGuid?: string;
}

interface P1Counts {
  facilities: number;
  meters: number;
  meterData: number;
  meterGroups: number;
  predictors: number;
  predictorData: number;
  facilityAnalyses: number;
  accountAnalyses: number;
  accountReports: number;
  facilityReports: number;
  customData: number;
  energyUseGroups: number;
  energyUseEquipment: number;
}

export function buildP1PrototypeData(input: P1RealDataInput): P1PrototypeData {
  const snapshot = input.snapshot;
  const activeAccountGuid = snapshot?.account.guid;
  const activeCounts = snapshot ? getAccountCounts(snapshot) : undefined;
  const accounts = input.accounts
    .filter(account => !account.deleteAccount)
    .map(account => mapAccount(account, activeAccountGuid, activeCounts));
  const selectedFacilityGuid = input.selectedFacilityGuid || snapshot?.facilities[0]?.guid;
  const facilities = snapshot
    ? snapshot.facilities.map(facility => mapFacility(facility.guid, snapshot))
    : [];
  const selectedFacility = facilities.find(facility => facility.id === selectedFacilityGuid) || facilities[0];
  const viewState = getViewState(input);
  const facilityCounts = snapshot && selectedFacility ? getFacilityCounts(selectedFacility.id, snapshot) : undefined;
  const accountContent = buildAccountContent(snapshot);
  const facilityContent = buildFacilityContent(snapshot, selectedFacility?.id);
  const setup = buildSetupSummary(snapshot, selectedFacility?.id);

  return {
    state: viewState,
    selectedAccountId: activeAccountGuid,
    selectedFacilityId: selectedFacility?.id,
    accounts,
    facilities,
    welcomeActions: p1WelcomeActions,
    sections: p1Sections,
    nav: buildNav(activeCounts, facilityCounts),
    content: {
      account: accountContent,
      facility: facilityContent
    },
    panel: {
      account: buildPanels(accountContent, setup.accountTasks),
      facility: buildPanels(facilityContent, setup.selectedFacilityTasks)
    },
    setup
  };
}

function getViewState(input: P1RealDataInput): P1ViewState {
  if (input.startupState.status === 'initializing' || input.startupState.status === 'idle' || input.workspaceStatus === 'loading' || input.workspaceStatus === 'switching') {
    return {
      status: 'loading',
      message: input.startupState.message || 'Loading workspace data...'
    };
  }
  if (input.startupState.status === 'error') {
    return {
      status: 'error',
      message: input.startupState.message || input.startupState.error?.message || 'VERIFI could not load application data.'
    };
  }
  if (input.workspaceStatus === 'error') {
    return {
      status: 'error',
      message: input.workspaceError?.message || 'The active account workspace could not be loaded.'
    };
  }
  if (input.accounts.length === 0 || input.startupState.status === 'empty') {
    return {
      status: 'empty',
      message: input.startupState.message || 'No VERIFI accounts are available in this browser profile.'
    };
  }
  return {
    status: 'ready',
    message: 'Workspace data is ready.'
  };
}

function mapAccount(account: IdbAccount, activeAccountGuid?: string, activeCounts?: P1Counts): P1AccountSummary {
  const isActive = account.guid === activeAccountGuid;
  const facilityCount = isActive ? activeCounts?.facilities ?? 0 : parseOptionalCount(account.numberOfFacilities);
  return {
    id: account.guid,
    name: account.name || 'Untitled account',
    descriptor: formatAccountDescriptor(account),
    lastModified: formatDate(account.modifiedDate),
    facilityCount,
    facilityCountLabel: facilityCount === undefined ? 'Open to load counts' : pluralize(facilityCount, 'facility'),
    meterCountLabel: isActive && activeCounts ? pluralize(activeCounts.meters, 'meter') : 'Open to load meters',
    predictorCountLabel: isActive && activeCounts ? pluralize(activeCounts.predictors, 'predictor') : 'Open to load predictors',
    reportCountLabel: isActive && activeCounts ? pluralize(activeCounts.accountReports + activeCounts.facilityReports, 'report') : 'Open to load reports',
    status: isActive ? 'Active account' : 'Available account',
    isActive,
    isSingleFacilityCompany: !!account.isSingleFacilityCompany
  };
}

function mapFacility(facilityGuid: string, snapshot: AccountWorkspaceSnapshot): P1FacilitySummary {
  const facility = snapshot.facilities.find(item => item.guid === facilityGuid);
  if (!facility) {
    throw new Error('The requested facility is not part of the active workspace snapshot.');
  }
  const counts = getFacilityCounts(facilityGuid, snapshot);
  return {
    id: facility.guid,
    accountId: facility.accountId,
    name: facility.name || 'Untitled facility',
    location: formatLocation(facility),
    status: getFacilityStatus(counts),
    meters: counts.meters,
    meterReadings: counts.meterData,
    predictors: counts.predictors,
    analyses: counts.facilityAnalyses,
    reports: counts.facilityReports,
    equipment: counts.energyUseEquipment,
    footprint: pluralize(counts.energyUseEquipment, 'equipment item')
  };
}

function buildAccountContent(snapshot?: AccountWorkspaceSnapshot): Record<P1SectionId, P1WorkspaceContent> {
  const accountName = snapshot?.account.name || 'Account workspace';
  const counts = snapshot ? getAccountCounts(snapshot) : emptyCounts();
  return {
    home: makeContent({
      eyebrow: 'Account workspace',
      title: accountName,
      summary: 'Portfolio-level read-only view of setup, data, analysis, reports, and account-owned reference data.',
      primaryAction: 'Read-only prototype',
      metrics: [
        metric('Facilities', counts.facilities, 'Loaded from active workspace', toneForCount(counts.facilities)),
        metric('Meters', counts.meters, 'Utility meters across the account', toneForCount(counts.meters)),
        metric('Analyses', counts.facilityAnalyses + counts.accountAnalyses, 'Facility and account analysis records', toneForCount(counts.facilityAnalyses + counts.accountAnalyses)),
        metric('Reports', counts.accountReports + counts.facilityReports, 'Account and facility report records', toneForCount(counts.accountReports + counts.facilityReports))
      ],
      cards: [
        card('Workspace source', 'This prototype is reading the active account workspace snapshot.', 'IndexedDB', 'info'),
        card('Read-only mode', 'Prototype controls do not create, import, export, calculate, or persist records.', 'No writes', 'neutral'),
        card('Facility coverage', `${pluralize(counts.facilities, 'facility')} available for drilldown.`, counts.facilities > 0 ? 'Available' : 'Empty', toneForCount(counts.facilities))
      ],
      activity: workspaceNotes(counts)
    }),
    data: makeContent({
      eyebrow: 'Account data',
      title: 'Portfolio data coverage',
      summary: 'A consolidated account view for facilities, meters, meter readings, predictors, and energy-use setup.',
      primaryAction: 'Read-only data',
      metrics: [
        metric('Facilities', counts.facilities, 'Account-owned facilities', toneForCount(counts.facilities)),
        metric('Meters', counts.meters, 'Utility meter records', toneForCount(counts.meters)),
        metric('Meter readings', counts.meterData, 'Meter data records', toneForCount(counts.meterData)),
        metric('Predictors', counts.predictors, 'Production, weather, and other predictors', toneForCount(counts.predictors))
      ],
      cards: [
        card('Meter groups', `${pluralize(counts.meterGroups, 'meter group')} in the account.`, 'Groups', toneForCount(counts.meterGroups)),
        card('Predictor readings', `${pluralize(counts.predictorData, 'predictor reading')} available.`, 'Drivers', toneForCount(counts.predictorData)),
        card('Energy-use equipment', `${pluralize(counts.energyUseGroups, 'group')} and ${pluralize(counts.energyUseEquipment, 'equipment item')} loaded.`, 'Footprint', toneForCount(counts.energyUseEquipment))
      ],
      activity: workspaceNotes(counts)
    }),
    visualization: makeContent({
      eyebrow: 'Account visualization',
      title: 'Portfolio trend exploration',
      summary: 'Read-only inventory of the data available for future account-level visualization concepts.',
      primaryAction: 'Read-only visuals',
      metrics: [
        metric('Meter readings', counts.meterData, 'Potential utility time-series points', toneForCount(counts.meterData)),
        metric('Predictor readings', counts.predictorData, 'Potential driver time-series points', toneForCount(counts.predictorData)),
        metric('Meter groups', counts.meterGroups, 'Grouping context for charts', toneForCount(counts.meterGroups)),
        metric('Facilities', counts.facilities, 'Comparison candidates', toneForCount(counts.facilities))
      ],
      cards: [
        card('Time series', 'Meter and predictor readings are available as chart source data.', 'Inventory', toneForCount(counts.meterData + counts.predictorData)),
        card('Facility comparison', 'Facilities can be compared once their workspace data is loaded.', 'Portfolio', toneForCount(counts.facilities)),
        card('No calculations run', 'This prototype does not calendarize, normalize, or compute emissions totals.', 'Read-only', 'neutral')
      ],
      activity: workspaceNotes(counts)
    }),
    analysis: makeContent({
      eyebrow: 'Account analysis',
      title: 'Account rollup and performance analysis',
      summary: 'Read-only view of existing analysis setup records without running analysis calculations.',
      primaryAction: 'Read-only analysis',
      metrics: [
        metric('Facility analyses', counts.facilityAnalyses, 'Facility-level analysis records', toneForCount(counts.facilityAnalyses)),
        metric('Account analyses', counts.accountAnalyses, 'Account rollup records', toneForCount(counts.accountAnalyses)),
        metric('Meter groups', counts.meterGroups, 'Analysis grouping inputs', toneForCount(counts.meterGroups)),
        metric('Predictors', counts.predictors, 'Analysis driver inputs', toneForCount(counts.predictors))
      ],
      cards: [
        card('Facility analysis setup', `${pluralize(counts.facilityAnalyses, 'analysis')} loaded from persistence.`, 'Facility', toneForCount(counts.facilityAnalyses)),
        card('Account rollups', `${pluralize(counts.accountAnalyses, 'account analysis')} available.`, 'Account', toneForCount(counts.accountAnalyses)),
        card('Calculation boundary', 'Results are not recomputed in this prototype migration.', 'Preserved', 'neutral')
      ],
      activity: workspaceNotes(counts)
    }),
    reports: makeContent({
      eyebrow: 'Account reports',
      title: 'Report center',
      summary: 'Read-only inventory of existing account and facility report setup records.',
      primaryAction: 'Read-only reports',
      metrics: [
        metric('Account reports', counts.accountReports, 'Portfolio report records', toneForCount(counts.accountReports)),
        metric('Facility reports', counts.facilityReports, 'Facility report records', toneForCount(counts.facilityReports)),
        metric('Analyses', counts.facilityAnalyses + counts.accountAnalyses, 'Potential report inputs', toneForCount(counts.facilityAnalyses + counts.accountAnalyses)),
        metric('Meter data', counts.meterData, 'Potential report data records', toneForCount(counts.meterData))
      ],
      cards: [
        card('Report setup', `${pluralize(counts.accountReports + counts.facilityReports, 'report')} loaded.`, 'Existing records', toneForCount(counts.accountReports + counts.facilityReports)),
        card('Exports disabled', 'The prototype does not invoke Excel, PDF, PowerPoint, or backup export flows.', 'No output', 'neutral'),
        card('Data checks', 'Production report validation remains outside this count-first migration.', 'Out of scope', 'info')
      ],
      activity: workspaceNotes(counts)
    }),
    settings: makeContent({
      eyebrow: 'Account settings',
      title: 'Account configuration and shared factors',
      summary: 'Read-only inventory of account details and custom factors already stored with the workspace.',
      primaryAction: 'Read-only settings',
      metrics: [
        metric('Custom fuels', counts.customData, 'Custom factor records', toneForCount(counts.customData)),
        metric('Facilities', counts.facilities, 'Facility defaults and overrides', toneForCount(counts.facilities)),
        metric('Reports', counts.accountReports + counts.facilityReports, 'Records using account settings', toneForCount(counts.accountReports + counts.facilityReports)),
        metric('Workspace mode', 'Read-only', 'No account settings are persisted', 'neutral')
      ],
      cards: [
        card('Account profile', 'Account name, location, units, and reporting preferences come from the active account.', 'Loaded', snapshot ? 'info' : 'neutral'),
        card('Custom factors', `${pluralize(counts.customData, 'custom data record')} available.`, 'Reference data', toneForCount(counts.customData)),
        card('No writes', 'Settings controls are intentionally disabled in this prototype route.', 'Read-only', 'neutral')
      ],
      activity: workspaceNotes(counts)
    }),
    imports: makeContent({
      eyebrow: 'Imports and backup',
      title: 'Bring data in and protect account work',
      summary: 'Read-only inventory of imported or restored data already present in the active workspace.',
      primaryAction: 'Read-only imports',
      metrics: [
        metric('Accounts', snapshot ? 1 : 0, 'Active workspace loaded', snapshot ? 'success' : 'neutral'),
        metric('Meter readings', counts.meterData, 'Persisted meter data records', toneForCount(counts.meterData)),
        metric('Predictor readings', counts.predictorData, 'Persisted predictor data records', toneForCount(counts.predictorData)),
        metric('Prototype mode', 'No import', 'Import and backup flows are not invoked', 'neutral')
      ],
      cards: [
        card('Import disabled', 'Template and general-file upload workflows stay untouched by this prototype.', 'No writes', 'neutral'),
        card('Backup disabled', 'Backup export and restore coordinators are not called from p1.', 'No files', 'neutral'),
        card('Existing data only', 'The screen reflects records already present in IndexedDB.', 'Read-only', 'info')
      ],
      activity: workspaceNotes(counts)
    })
  };
}

function buildFacilityContent(snapshot?: AccountWorkspaceSnapshot, selectedFacilityGuid?: string): Record<P1SectionId, P1WorkspaceContent> {
  const facility = snapshot?.facilities.find(item => item.guid === selectedFacilityGuid) || snapshot?.facilities[0];
  const counts = facility && snapshot ? getFacilityCounts(facility.guid, snapshot) : emptyCounts();
  const facilityName = facility?.name || 'Facility workspace';
  return {
    home: makeFacilityContent(facilityName, 'Facility workspace', 'Facility-level read-only view of meters, predictors, analyses, reports, and energy-use equipment.', counts),
    data: makeFacilityContent('Meters, predictors, weather, and equipment', 'Facility data', 'Facility data brings together utility meters, meter readings, predictors, meter groups, and energy-use equipment.', counts),
    visualization: makeFacilityContent('Explore meter and predictor relationships', 'Facility visualization', 'Read-only inventory of the records available for future facility visualization concepts.', counts),
    analysis: makeFacilityContent('Facility modeling and savings', 'Facility analysis', 'Read-only view of existing facility analysis records without running models.', counts),
    reports: makeFacilityContent('Facility reporting outputs', 'Facility reports', 'Read-only inventory of existing facility report setup records.', counts),
    settings: makeFacilityContent('Facility profile and local preferences', 'Facility settings', 'Read-only facility context with account-owned factors kept in the account workspace.', counts),
    imports: makeFacilityContent('Facility-level import and backup actions', 'Facility imports', 'Read-only view of facility data that already exists in the active account.', counts)
  };
}

function makeFacilityContent(title: string, eyebrow: string, summary: string, counts: P1Counts): P1WorkspaceContent {
  return makeContent({
    eyebrow,
    title,
    summary,
    primaryAction: 'Read-only prototype',
    metrics: [
      metric('Meters', counts.meters, 'Facility utility meter records', toneForCount(counts.meters)),
      metric('Meter readings', counts.meterData, 'Facility meter data records', toneForCount(counts.meterData)),
      metric('Predictors', counts.predictors, 'Facility predictor records', toneForCount(counts.predictors)),
      metric('Reports', counts.facilityReports, 'Facility report records', toneForCount(counts.facilityReports))
    ],
    cards: [
      card('Utility data', `${pluralize(counts.meters, 'meter')} and ${pluralize(counts.meterData, 'meter reading')} loaded.`, 'Data', toneForCount(counts.meters + counts.meterData)),
      card('Analysis setup', `${pluralize(counts.facilityAnalyses, 'analysis')} available for this facility.`, 'Analysis', toneForCount(counts.facilityAnalyses)),
      card('Energy-use equipment', `${pluralize(counts.energyUseGroups, 'group')} and ${pluralize(counts.energyUseEquipment, 'equipment item')} loaded.`, 'Footprint', toneForCount(counts.energyUseEquipment))
    ],
    activity: workspaceNotes(counts)
  });
}

function buildNav(accountCounts?: P1Counts, facilityCounts?: P1Counts): Record<P1ContextMode, Record<P1SectionId, Array<P1NavGroup>>> {
  const account = accountCounts || emptyCounts();
  const facility = facilityCounts || emptyCounts();
  return {
    account: {
      home: [{ title: 'Workspace', items: [{ id: 'overview', label: 'Overview' }, { id: 'goal-progress', label: 'Goal Progress' }, { id: 'todo-list', label: 'Todo List' }] }],
      data: [{ title: 'Account Data', items: [{ id: 'meters', label: 'Meters', meta: `${account.meters} total`, status: toneForCount(account.meters) }, { id: 'predictors', label: 'Predictors', meta: String(account.predictors), status: toneForCount(account.predictors) }, { id: 'energy-uses', label: 'Energy Uses', meta: String(account.energyUseEquipment), status: toneForCount(account.energyUseEquipment) }, { id: 'events', label: 'Events' }] }],
      visualization: [{ title: 'Explore', items: [{ id: 'time-series', label: 'Time series' }, { id: 'trends', label: 'Utility trends' }, { id: 'compare', label: 'Facility comparison' }] }],
      analysis: [{ title: 'Account Analysis', items: [{ id: 'rollup', label: 'Account rollup', status: toneForCount(account.accountAnalyses) }, { id: 'savings', label: 'Savings summary' }, { id: 'footprint-analysis', label: 'Footprint analysis' }] }],
      reports: [{ title: 'Reports', items: [{ id: 'setup', label: 'Report setup' }, { id: 'data-checks', label: 'Data checks' }, { id: 'generated', label: 'Generated reports', meta: String(account.accountReports + account.facilityReports) }, { id: 'footprint-report', label: 'Footprint outputs' }] }],
      settings: [{ title: 'Account Settings', items: [{ id: 'profile', label: 'Corporate information' }, { id: 'units', label: 'Units and emissions' }, { id: 'goals', label: 'Reduction goals' }, { id: 'financial', label: 'Financial reporting' }, { id: 'staleness', label: 'Data staleness' }, { id: 'backup', label: 'Backup and import' }, { id: 'delete', label: 'Delete account' }] }],
      imports: [
        { title: 'Import', items: [{ id: 'template', label: 'Upload template' }, { id: 'general', label: 'Upload general file' }, { id: 'backup', label: 'Upload account backup' }] },
        { title: 'Backup', items: [{ id: 'export', label: 'Export account' }, { id: 'example', label: 'Load example account' }] }
      ]
    },
    facility: {
      home: [{ title: 'Facility Workspace', items: [{ id: 'overview', label: 'Overview' }, { id: 'goal-progress', label: 'Goal Progress' }, { id: 'todo-list', label: 'Todo List' }] }],
      data: [{ title: 'Facility Data', items: [{ id: 'meters', label: 'Meters', meta: String(facility.meters), status: toneForCount(facility.meters) }, { id: 'predictors', label: 'Predictors', meta: String(facility.predictors), status: toneForCount(facility.predictors) }, { id: 'energy-uses', label: 'Energy Uses', meta: String(facility.energyUseEquipment), status: toneForCount(facility.energyUseEquipment) }, { id: 'events', label: 'Events' }] }],
      visualization: [{ title: 'Facility Charts', items: [{ id: 'time-series', label: 'Time series' }, { id: 'correlation', label: 'Correlation plots' }, { id: 'heatmap', label: 'Heatmaps' }] }],
      analysis: [{ title: 'Facility Analysis', items: [{ id: 'setup', label: 'Analysis setup', status: toneForCount(facility.facilityAnalyses) }, { id: 'results', label: 'Results' }, { id: 'footprint-analysis', label: 'Footprint analysis' }] }],
      reports: [{ title: 'Facility Reports', items: [{ id: 'overview-report', label: 'Overview report' }, { id: 'analysis-report', label: 'Analysis report' }, { id: 'quality-report', label: 'Data quality report' }, { id: 'footprint-report', label: 'Footprint output' }] }],
      settings: [{ title: 'Facility Settings', items: [{ id: 'profile', label: 'Facility information' }, { id: 'units', label: 'Units and emissions' }, { id: 'goals', label: 'Reduction goals' }, { id: 'financial', label: 'Financial reporting' }, { id: 'staleness', label: 'Data staleness' }, { id: 'backup', label: 'Backup and import' }, { id: 'delete', label: 'Delete facility' }] }],
      imports: [
        { title: 'Facility Import', items: [{ id: 'meter-import', label: 'Meter readings' }, { id: 'predictor-import', label: 'Predictor data' }, { id: 'footprint-import', label: 'Footprint data' }] },
        { title: 'Backup', items: [{ id: 'account-backup', label: 'Account backup status' }] }
      ]
    }
  };
}

function buildPanels(content: Record<P1SectionId, P1WorkspaceContent>, setupTasks: Array<P1SetupTask>): Record<P1SectionId, P1PanelContent> {
  return {
    home: makePanel(content.home, setupTasks),
    data: makePanel(content.data, setupTasks.filter(task => task.section === 'data')),
    visualization: makePanel(content.visualization, setupTasks.filter(task => task.section === 'visualization')),
    analysis: makePanel(content.analysis, setupTasks.filter(task => task.section === 'analysis')),
    reports: makePanel(content.reports, setupTasks.filter(task => task.section === 'reports')),
    settings: makePanel(content.settings, setupTasks.filter(task => task.section === 'settings')),
    imports: makePanel(content.imports, setupTasks.filter(task => task.section === 'imports'))
  };
}

function makePanel(content: P1WorkspaceContent, todoTasks: Array<P1SetupTask>): P1PanelContent {
  return {
    help: [
      `${content.title} is populated from existing VERIFI workspace data.`,
      'This prototype is read-only; actions are shown as concept labels and do not persist changes.',
      'Counts reflect records already loaded for the active account workspace.'
    ],
    todos: todoTasks,
    results: content.metrics,
    details: content.cards
  };
}

function makeContent(content: P1WorkspaceContent): P1WorkspaceContent {
  return content;
}

function metric(label: string, value: number | string, trend: string, tone: P1StatusTone): P1Metric {
  return { label, value: String(value), trend, tone };
}

function card(title: string, summary: string, meta: string, tone: P1StatusTone): P1ContentCard {
  return { title, summary, meta, tone };
}

function buildSetupSummary(snapshot?: AccountWorkspaceSnapshot, selectedFacilityGuid?: string): P1SetupSummary {
  if (!snapshot) {
    return {
      accountTasks: [],
      selectedFacilityTasks: [],
      allTasks: [],
      completeCount: 0,
      totalCount: 0
    };
  }

  const accountTasks = buildAccountSetupTasks(snapshot.account, getAccountCounts(snapshot));
  const facilityTaskGroups = snapshot.facilities.map(facility =>
    buildFacilitySetupTasks(facility, getFacilityCounts(facility.guid, snapshot))
  );
  const allFacilityTasks = facilityTaskGroups.flat();
  const selectedFacilityTasks = selectedFacilityGuid
    ? facilityTaskGroups[snapshot.facilities.findIndex(facility => facility.guid === selectedFacilityGuid)] || []
    : facilityTaskGroups[0] || [];
  const allTasks = [...accountTasks, ...allFacilityTasks];
  const completeCount = allTasks.filter(task => task.status === 'complete').length;
  return {
    accountTasks,
    selectedFacilityTasks,
    allTasks,
    completeCount,
    totalCount: allTasks.length,
    nextTaskId: allTasks.find(task => task.status !== 'complete')?.id
  };
}

function buildAccountSetupTasks(account: IdbAccount, counts: P1Counts): Array<P1SetupTask> {
  return [
    setupTask({
      id: 'account-facilities',
      contextMode: 'account',
      group: 'Account setup',
      title: counts.facilities > 0 ? 'Facility data is started' : 'Add or import facility data',
      summary: counts.facilities > 0
        ? `${pluralize(counts.facilities, 'facility')} available. Continue with facility-level settings and data setup.`
        : 'Create a facility manually or use an import path so the account has somewhere to store meters, predictors, analyses, and reports.',
      status: counts.facilities > 0 ? 'complete' : 'blocked',
      section: 'home',
      detail: 'todo-list'
    })
  ];
}

function buildFacilitySetupTasks(facility: IdbFacility, counts: P1Counts): Array<P1SetupTask> {
  return [
    setupTask({
      id: `facility-${facility.guid}-profile`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: 'Complete facility information',
      summary: 'Confirm facility name, location, classification, area, NAICS code, and local contact details.',
      status: facility.name && facility.name !== 'New Facility' ? 'complete' : 'ready',
      section: 'settings',
      detail: 'profile'
    }),
    setupTask({
      id: `facility-${facility.guid}-meters`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.meters > 0 ? 'Utility meters are started' : 'Add utility meters',
      summary: counts.meters > 0
        ? `${pluralize(counts.meters, 'meter')} available for this facility.`
        : 'Add utility meters before entering readings, grouping meters, or running analyses.',
      status: counts.meters > 0 ? 'complete' : 'blocked',
      section: 'data',
      detail: 'meters'
    }),
    setupTask({
      id: `facility-${facility.guid}-meter-data`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.meterData > 0 ? 'Meter readings are started' : 'Add meter readings',
      summary: counts.meterData > 0
        ? `${pluralize(counts.meterData, 'meter reading')} loaded for this facility.`
        : 'Enter or import utility meter readings so dashboards, analyses, and reports have source data.',
      status: counts.meterData > 0 ? 'complete' : counts.meters > 0 ? 'ready' : 'blocked',
      section: 'data',
      detail: 'meters'
    }),
    setupTask({
      id: `facility-${facility.guid}-meter-groups`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.meterGroups > 0 ? 'Meter groups are started' : 'Create meter groups',
      summary: counts.meterGroups > 0
        ? `${pluralize(counts.meterGroups, 'meter group')} available for analysis setup.`
        : 'Group meters so VERIFI can organize facility analysis and reporting outputs.',
      status: counts.meterGroups > 0 ? 'complete' : counts.meters > 0 ? 'ready' : 'blocked',
      section: 'data',
      detail: 'meters'
    }),
    setupTask({
      id: `facility-${facility.guid}-predictors`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.predictors > 0 ? 'Predictors are started' : 'Add predictors',
      summary: counts.predictors > 0
        ? `${pluralize(counts.predictors, 'predictor')} available for this facility.`
        : 'Add production, weather, or other predictor data used to explain changes in resource use.',
      status: counts.predictors > 0 ? 'complete' : 'ready',
      section: 'data',
      detail: 'predictors'
    }),
    setupTask({
      id: `facility-${facility.guid}-analysis`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.facilityAnalyses > 0 ? 'Facility analysis is started' : 'Create facility analysis',
      summary: counts.facilityAnalyses > 0
        ? `${pluralize(counts.facilityAnalyses, 'analysis')} available for this facility.`
        : 'Create facility analysis after meters, readings, groups, and predictors are ready.',
      status: counts.facilityAnalyses > 0 ? 'complete' : counts.meterData > 0 ? 'ready' : 'blocked',
      section: 'analysis',
      detail: 'dashboard'
    }),
    setupTask({
      id: `facility-${facility.guid}-reports`,
      contextMode: 'facility',
      facilityId: facility.guid,
      group: facility.name || 'Facility setup',
      title: counts.facilityReports > 0 ? 'Facility reports are started' : 'Create facility reports',
      summary: counts.facilityReports > 0
        ? `${pluralize(counts.facilityReports, 'report')} available for this facility.`
        : 'Create reports after analysis setup is available.',
      status: counts.facilityReports > 0 ? 'complete' : counts.facilityAnalyses > 0 ? 'ready' : 'blocked',
      section: 'reports',
      detail: 'overview-report'
    })
  ];
}

function setupTask(config: {
  id: string;
  contextMode: P1ContextMode;
  facilityId?: string;
  group: string;
  title: string;
  summary: string;
  status: 'complete' | 'ready' | 'blocked';
  section: P1SectionId;
  detail: string;
  required?: boolean;
}): P1SetupTask {
  const tone = setupTone(config.status);
  const panelTab = 'todos';
  return {
    id: config.id,
    contextMode: config.contextMode,
    facilityId: config.facilityId,
    group: config.group,
    title: config.title,
    summary: config.summary,
    meta: setupStatusLabel(config.status),
    tone,
    status: config.status,
    statusLabel: setupStatusLabel(config.status),
    required: config.required ?? true,
    section: config.section,
    detail: config.detail,
    panelTab
  };
}

function setupTone(status: 'complete' | 'ready' | 'blocked'): P1StatusTone {
  if (status === 'complete') {
    return 'success';
  }
  return status === 'blocked' ? 'danger' : 'warning';
}

function setupStatusLabel(status: 'complete' | 'ready' | 'blocked'): string {
  if (status === 'complete') {
    return 'Complete';
  }
  return status === 'blocked' ? 'Needs setup' : 'Review';
}

function getAccountCounts(snapshot: AccountWorkspaceSnapshot): P1Counts {
  return {
    facilities: snapshot.facilities.length,
    meters: snapshot.meters.length,
    meterData: snapshot.meterData.length,
    meterGroups: snapshot.meterGroups.length,
    predictors: snapshot.predictors.length,
    predictorData: snapshot.predictorData.length,
    facilityAnalyses: snapshot.facilityAnalyses.length,
    accountAnalyses: snapshot.accountAnalyses.length,
    accountReports: snapshot.accountReports.length,
    facilityReports: snapshot.facilityReports.length,
    customData: snapshot.customFuels.length + snapshot.customEmissions.length + snapshot.customGWPs.length,
    energyUseGroups: snapshot.energyUseGroups.length,
    energyUseEquipment: snapshot.energyUseEquipment.length
  };
}

function getFacilityCounts(facilityGuid: string, snapshot: AccountWorkspaceSnapshot): P1Counts {
  return {
    facilities: 1,
    meters: snapshot.meters.filter(item => item.facilityId === facilityGuid).length,
    meterData: snapshot.meterData.filter(item => item.facilityId === facilityGuid).length,
    meterGroups: snapshot.meterGroups.filter(item => item.facilityId === facilityGuid).length,
    predictors: snapshot.predictors.filter(item => item.facilityId === facilityGuid).length,
    predictorData: snapshot.predictorData.filter(item => item.facilityId === facilityGuid).length,
    facilityAnalyses: snapshot.facilityAnalyses.filter(item => item.facilityId === facilityGuid).length,
    accountAnalyses: 0,
    accountReports: 0,
    facilityReports: snapshot.facilityReports.filter(item => item.facilityId === facilityGuid).length,
    customData: 0,
    energyUseGroups: snapshot.energyUseGroups.filter(item => item.facilityId === facilityGuid).length,
    energyUseEquipment: snapshot.energyUseEquipment.filter(item => item.facilityId === facilityGuid).length
  };
}

function emptyCounts(): P1Counts {
  return {
    facilities: 0,
    meters: 0,
    meterData: 0,
    meterGroups: 0,
    predictors: 0,
    predictorData: 0,
    facilityAnalyses: 0,
    accountAnalyses: 0,
    accountReports: 0,
    facilityReports: 0,
    customData: 0,
    energyUseGroups: 0,
    energyUseEquipment: 0
  };
}

function toneForCount(count: number): P1StatusTone {
  return count > 0 ? 'success' : 'neutral';
}

function getFacilityStatus(counts: P1Counts): string {
  if (counts.facilityReports > 0) {
    return 'Reports available';
  }
  if (counts.facilityAnalyses > 0) {
    return 'Analysis available';
  }
  if (counts.meters > 0 || counts.predictors > 0) {
    return 'Data available';
  }
  return 'Needs setup';
}

function workspaceNotes(counts: P1Counts): Array<string> {
  const navigationRecords = counts.meters + counts.predictors;
  return [
    `${pluralize(counts.facilities, 'facility')} in the current workspace scope.`,
    `${navigationRecords} meter/predictor ${navigationRecords === 1 ? 'record' : 'records'} available for prototype navigation.`,
    'No calculations, imports, exports, reports, or persistence writes are run from this route.'
  ];
}

function pluralize(count: number, singular: string): string {
  if (singular.endsWith('y')) {
    return `${count} ${singular.slice(0, -1)}${count === 1 ? 'y' : 'ies'}`;
  }
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function formatAccountDescriptor(account: IdbAccount): string {
  const location = formatLocation(account);
  const naics = [account.naics1, account.naics2, account.naics3].filter(value => value !== undefined).join('-');
  if (naics && location !== 'Location not set') {
    return `NAICS ${naics} / ${location}`;
  }
  return naics ? `NAICS ${naics}` : location;
}

function formatLocation(value: { city?: string; state?: string; country?: string }): string {
  const cityState = [value.city, value.state].filter(Boolean).join(', ');
  return cityState || value.country || 'Location not set';
}

function formatDate(date: Date | string | undefined): string {
  if (!date) {
    return 'Unknown';
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseOptionalCount(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
