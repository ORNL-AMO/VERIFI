import { P1PrototypeData, P1SectionId, P1WorkspaceContent } from './p1.models';

const accountContent: Record<P1SectionId, P1WorkspaceContent> = {
  home: {
    eyebrow: 'Account workspace',
    title: 'Example Manufacturing Group',
    summary: 'Portfolio-level status for setup, utility data readiness, analysis progress, and reporting work across three facilities.',
    primaryAction: 'Review setup progress',
    metrics: [
      { label: 'Facilities', value: '3', trend: '2 ready for analysis', tone: 'success' },
      { label: 'Annual energy', value: '48.2B kBtu', trend: '4.8% below baseline', tone: 'success' },
      { label: 'Annual cost', value: '$3.84M', trend: '$186k avoided cost', tone: 'info' },
      { label: 'Open todos', value: '6', trend: '2 blocking reports', tone: 'warning' }
    ],
    cards: [
      { title: 'Portfolio setup', summary: 'Account profile, facilities, custom factors, and backup preferences are mostly complete.', meta: '88% complete', tone: 'success' },
      { title: 'Data readiness', summary: 'One facility needs weather predictor review before analysis can be finalized.', meta: '1 warning', tone: 'warning' },
      { title: 'Reporting path', summary: 'Better Plants and performance reports are ready after account rollup analysis is refreshed.', meta: 'Next action', tone: 'info' }
    ],
    activity: ['North Plant meter data imported yesterday', 'Account analysis refreshed for 2026', 'South Works emissions factors need review']
  },
  data: {
    eyebrow: 'Account data',
    title: 'Portfolio data coverage',
    summary: 'A consolidated account view for facilities, meters, readings, predictors, weather data, and energy-use setup.',
    primaryAction: 'Add facility data',
    metrics: [
      { label: 'Facilities', value: '3', trend: '1 needs attention', tone: 'warning' },
      { label: 'Meters', value: '24', trend: '21 current', tone: 'success' },
      { label: 'Predictors', value: '12', trend: 'Weather linked to 8', tone: 'info' },
      { label: 'Equipment groups', value: '9', trend: '6 mapped to meters', tone: 'warning' }
    ],
    cards: [
      { title: 'Facilities', summary: 'Review account facilities and jump into facility-level setup when details are needed.', meta: '3 active', tone: 'success' },
      { title: 'Weather and predictors', summary: 'Weather stations and production predictors live with the rest of utility data.', meta: '2 updates', tone: 'info' },
      { title: 'Energy-use equipment', summary: 'Equipment groups remain part of data setup and feed later footprint analysis and reports.', meta: 'Draft', tone: 'warning' }
    ],
    activity: ['Steam meter imported for North Plant', 'Cooling degree day predictor calculated', 'Boiler house equipment group awaiting meter mapping']
  },
  visualization: {
    eyebrow: 'Account visualization',
    title: 'Portfolio trend exploration',
    summary: 'Account-wide entry point for trend review before drilling into facility charts and correlations.',
    primaryAction: 'Open trend view',
    metrics: [
      { label: 'Utility series', value: '18', trend: 'Electricity leads variance', tone: 'info' },
      { label: 'Facility comparisons', value: '3', trend: 'North Plant improving', tone: 'success' },
      { label: 'Flagged months', value: '5', trend: 'Across 2 facilities', tone: 'warning' },
      { label: 'Charts saved', value: '4', trend: 'Ready for reports', tone: 'neutral' }
    ],
    cards: [
      { title: 'Time series', summary: 'Compare facilities and fuel sources over time with shared date controls.', meta: 'Portfolio view', tone: 'info' },
      { title: 'Utility trends', summary: 'Spot unusual cost, use, emissions, and water movement across the account.', meta: '5 flags', tone: 'warning' },
      { title: 'Facility drilldown', summary: 'Select a facility for heatmaps, meter-level plots, and predictor relationships.', meta: 'Context switch', tone: 'neutral' }
    ],
    activity: ['Annual comparison chart reviewed', 'Water trend flagged at South Works', 'Cost view filtered to electricity']
  },
  analysis: {
    eyebrow: 'Account analysis',
    title: 'Account rollup and performance analysis',
    summary: 'Portfolio analysis combines completed facility analyses and summarizes performance, savings, and footprint-relevant outcomes.',
    primaryAction: 'Refresh account analysis',
    metrics: [
      { label: 'Facility analyses', value: '7', trend: '6 current', tone: 'warning' },
      { label: 'Modeled savings', value: '4.8%', trend: 'Against 2021 baseline', tone: 'success' },
      { label: 'Avoided emissions', value: '2,180 mtCO2e', trend: 'Scope 1 and 2', tone: 'success' },
      { label: 'Open checks', value: '2', trend: 'Before reports', tone: 'warning' }
    ],
    cards: [
      { title: 'Account rollup', summary: 'Roll facility analysis results into account-level performance metrics.', meta: 'Needs refresh', tone: 'warning' },
      { title: 'Savings summary', summary: 'Review energy and cost savings before sending values into reports.', meta: '4.8%', tone: 'success' },
      { title: 'Footprint analysis', summary: 'Use equipment and utility data to understand where energy is going across the account.', meta: 'Analysis view', tone: 'info' }
    ],
    activity: ['North Plant annual analysis accepted', 'South Works model selection pending', 'Corporate rollup scheduled for review']
  },
  reports: {
    eyebrow: 'Account reports',
    title: 'Report center',
    summary: 'Set up, validate, and preview account reports, including footprint outputs after analysis is ready.',
    primaryAction: 'Create report',
    metrics: [
      { label: 'Draft reports', value: '4', trend: '2 ready to preview', tone: 'info' },
      { label: 'Data checks', value: '2', trend: 'Blocking final export', tone: 'warning' },
      { label: 'Footprint outputs', value: '3', trend: 'Linked to equipment data', tone: 'success' },
      { label: 'Recent exports', value: '6', trend: 'Last export Aug 8', tone: 'neutral' }
    ],
    cards: [
      { title: 'Better Plants report', summary: 'Account-level program report with energy performance values.', meta: 'Ready after refresh', tone: 'warning' },
      { title: 'Performance report', summary: 'Executive summary of energy, cost, emissions, and facility contributions.', meta: 'Draft', tone: 'info' },
      { title: 'Footprint report', summary: 'Energy footprint outputs live with report setup and generated report views.', meta: '3 facilities', tone: 'success' }
    ],
    activity: ['Data overview report exported', 'Report data check found missing weather values', 'Footprint report section reviewed']
  },
  settings: {
    eyebrow: 'Account settings',
    title: 'Account configuration and shared factors',
    summary: 'Manage account details, custom fuels, regional emissions data, GWP factors, and portfolio-level preferences.',
    primaryAction: 'Review account settings',
    metrics: [
      { label: 'Custom fuels', value: '5', trend: 'All current', tone: 'success' },
      { label: 'Emissions factors', value: '14', trend: '1 needs review', tone: 'warning' },
      { label: 'GWP sets', value: '2', trend: 'AR5 active', tone: 'info' },
      { label: 'Users', value: '1', trend: 'Local workspace', tone: 'neutral' }
    ],
    cards: [
      { title: 'Account profile', summary: 'Company details and shared reporting preferences.', meta: 'Complete', tone: 'success' },
      { title: 'Custom factors', summary: 'Custom fuels, emissions, and GWP factors are grouped under settings.', meta: '1 warning', tone: 'warning' },
      { title: 'Facility defaults', summary: 'Defaults can inform new facility setup without replacing facility-specific settings.', meta: 'Optional', tone: 'neutral' }
    ],
    activity: ['Custom electricity factor updated', 'Account profile checked', 'GWP set confirmed for reports']
  },
  imports: {
    eyebrow: 'Imports and backup',
    title: 'Bring data in and protect account work',
    summary: 'Lower-rail utility area for importing templates, restoring backups, loading examples, and exporting account data.',
    primaryAction: 'Upload data file',
    metrics: [
      { label: 'Last backup', value: 'Aug 8', trend: 'Manual backup', tone: 'success' },
      { label: 'Template imports', value: '3', trend: 'This quarter', tone: 'info' },
      { label: 'Open import checks', value: '1', trend: 'Meter mapping', tone: 'warning' },
      { label: 'Example data', value: 'Ready', trend: 'Available anytime', tone: 'neutral' }
    ],
    cards: [
      { title: 'Upload template', summary: 'Import facilities, meters, readings, predictors, and footprint data from supported files.', meta: 'Primary flow', tone: 'info' },
      { title: 'Account backup', summary: 'Restore or export account backup files to protect and share account work.', meta: 'Available', tone: 'neutral' },
      { title: 'Import review', summary: 'Show mapping and validation status before data is accepted.', meta: '1 pending', tone: 'warning' }
    ],
    activity: ['Template file reviewed', 'Account backup exported', 'Example account available from welcome']
  }
};

const facilityContent: Record<P1SectionId, P1WorkspaceContent> = {
  home: {
    eyebrow: 'Facility workspace',
    title: 'North Plant',
    summary: 'Facility-level status for meters, predictors, analysis readiness, reports, and energy footprint work.',
    primaryAction: 'Review facility todo list',
    metrics: [
      { label: 'Meters', value: '8', trend: '7 current', tone: 'warning' },
      { label: 'Annual energy', value: '16.8B kBtu', trend: '6.2% below baseline', tone: 'success' },
      { label: 'Annual cost', value: '$1.42M', trend: '$84k avoided cost', tone: 'success' },
      { label: 'Footprint coverage', value: '72%', trend: 'Meter groups mapped', tone: 'warning' }
    ],
    cards: [
      { title: 'Facility setup', summary: 'Core facility details are complete and ready for utility data maintenance.', meta: 'Complete', tone: 'success' },
      { title: 'Data readiness', summary: 'One natural gas meter needs two missing readings before reports are final.', meta: '1 blocker', tone: 'warning' },
      { title: 'Analysis path', summary: 'Annual analysis is current; monthly model needs a predictor check.', meta: 'Review', tone: 'info' }
    ],
    activity: ['Electricity readings imported', 'Steam group analysis accepted', 'Boiler equipment group updated']
  },
  data: {
    eyebrow: 'Facility data',
    title: 'Meters, predictors, weather, and equipment',
    summary: 'Facility data brings together utility meters, meter readings, predictors, weather observations, meter groups, and energy-use equipment.',
    primaryAction: 'Add meter reading',
    metrics: [
      { label: 'Meters', value: '8', trend: 'Electricity, gas, water', tone: 'success' },
      { label: 'Meter readings', value: '1,248', trend: '2 missing months', tone: 'warning' },
      { label: 'Predictors', value: '5', trend: '3 weather based', tone: 'info' },
      { label: 'Equipment groups', value: '4', trend: '72% mapped', tone: 'warning' }
    ],
    cards: [
      { title: 'Utility meters', summary: 'Manage meters and readings together instead of splitting setup from evaluation.', meta: '8 active', tone: 'success' },
      { title: 'Weather and predictors', summary: 'Weather data supports predictor calculations and analysis setup.', meta: 'Station linked', tone: 'info' },
      { title: 'Energy-use equipment', summary: 'Equipment groups remain data inputs that feed footprint analysis and reports.', meta: '2 gaps', tone: 'warning' }
    ],
    activity: ['Gas bill missing for March', 'Cooling degree days updated', 'Compressed air group mapped to electric meters']
  },
  visualization: {
    eyebrow: 'Facility visualization',
    title: 'Explore meter and predictor relationships',
    summary: 'Facility charts focus on time series, correlations, heatmaps, and utility trends before analysis setup.',
    primaryAction: 'Open time series',
    metrics: [
      { label: 'Charted meters', value: '8', trend: 'All active meters', tone: 'success' },
      { label: 'Correlations', value: '14', trend: '4 strong relationships', tone: 'info' },
      { label: 'Variance flags', value: '3', trend: 'Needs review', tone: 'warning' },
      { label: 'Saved views', value: '2', trend: 'Ready for reports', tone: 'neutral' }
    ],
    cards: [
      { title: 'Time series', summary: 'Compare energy, cost, water, emissions, production, and weather over time.', meta: '24 months', tone: 'info' },
      { title: 'Correlation plots', summary: 'Test utility use against predictors before choosing analysis models.', meta: '4 strong', tone: 'success' },
      { title: 'Heatmaps', summary: 'Spot unusual months and seasonality in dense meter data.', meta: '3 flags', tone: 'warning' }
    ],
    activity: ['Electricity versus production correlation reviewed', 'Variance heatmap flagged July', 'Water trend compared to occupancy']
  },
  analysis: {
    eyebrow: 'Facility analysis',
    title: 'Facility modeling and savings',
    summary: 'Set up and review facility analysis, including energy footprint views that help explain where energy is going.',
    primaryAction: 'Run facility analysis',
    metrics: [
      { label: 'Analyses', value: '3', trend: '2 accepted', tone: 'warning' },
      { label: 'Modeled savings', value: '6.2%', trend: 'Annual analysis', tone: 'success' },
      { label: 'Avoided cost', value: '$84k', trend: 'Weather-normalized', tone: 'success' },
      { label: 'Footprint gap', value: '28%', trend: 'Equipment mapping', tone: 'warning' }
    ],
    cards: [
      { title: 'Analysis setup', summary: 'Choose meter groups, predictors, baseline period, and model options.', meta: 'Monthly review', tone: 'warning' },
      { title: 'Results', summary: 'Review annual and monthly savings before account rollup and reports.', meta: '6.2%', tone: 'success' },
      { title: 'Footprint analysis', summary: 'Explain facility energy use by equipment group alongside savings results.', meta: '72% covered', tone: 'info' }
    ],
    activity: ['Annual electricity model accepted', 'Monthly steam model needs predictor review', 'Footprint analysis updated']
  },
  reports: {
    eyebrow: 'Facility reports',
    title: 'Facility reporting outputs',
    summary: 'Prepare facility reports, data-quality checks, savings summaries, and energy footprint report outputs.',
    primaryAction: 'Preview report',
    metrics: [
      { label: 'Draft reports', value: '5', trend: '3 ready', tone: 'info' },
      { label: 'Data checks', value: '1', trend: 'Missing gas bill', tone: 'warning' },
      { label: 'Footprint sections', value: '4', trend: 'Equipment and meter groups', tone: 'success' },
      { label: 'Exports', value: '2', trend: 'This month', tone: 'neutral' }
    ],
    cards: [
      { title: 'Facility overview report', summary: 'Summarize energy, water, cost, emissions, and key facility trends.', meta: 'Ready', tone: 'success' },
      { title: 'Analysis report', summary: 'Document analysis setup, model results, and savings.', meta: 'Draft', tone: 'info' },
      { title: 'Footprint report', summary: 'Publish equipment-level energy use once mapping gaps are resolved.', meta: '1 gap', tone: 'warning' }
    ],
    activity: ['Overview report previewed', 'Data quality check found gas gap', 'Footprint report section marked draft']
  },
  settings: {
    eyebrow: 'Facility settings',
    title: 'Facility profile and local preferences',
    summary: 'Facility settings replace account settings in facility context while shared factors remain account-owned.',
    primaryAction: 'Edit facility settings',
    metrics: [
      { label: 'Profile fields', value: '12/12', trend: 'Complete', tone: 'success' },
      { label: 'Reporting year', value: '2026', trend: 'Current', tone: 'info' },
      { label: 'Local factors', value: '2', trend: 'Inherited where possible', tone: 'neutral' },
      { label: 'Review items', value: '1', trend: 'Water baseline note', tone: 'warning' }
    ],
    cards: [
      { title: 'Facility profile', summary: 'Name, location, NAICS details, and operating characteristics.', meta: 'Complete', tone: 'success' },
      { title: 'Facility preferences', summary: 'Context-specific defaults for facility charts, analysis, and reports.', meta: 'Configured', tone: 'neutral' },
      { title: 'Shared factors', summary: 'Custom fuels and GWP factors remain account settings but are visible here.', meta: 'Inherited', tone: 'info' }
    ],
    activity: ['Facility profile reviewed', 'Reporting year confirmed', 'Water baseline note added']
  },
  imports: {
    eyebrow: 'Facility imports',
    title: 'Facility-level import and backup actions',
    summary: 'Imports stay in the lower utility rail, with facility context emphasizing meter, predictor, weather, and footprint data.',
    primaryAction: 'Import facility data',
    metrics: [
      { label: 'Last import', value: 'Aug 7', trend: 'Meter readings', tone: 'success' },
      { label: 'Pending maps', value: '1', trend: 'Gas meter', tone: 'warning' },
      { label: 'Backup status', value: 'Account', trend: 'Backups remain account-level', tone: 'neutral' },
      { label: 'Templates', value: '3', trend: 'Supported flows', tone: 'info' }
    ],
    cards: [
      { title: 'Meter import', summary: 'Load utility meter readings into this facility context.', meta: 'Common action', tone: 'info' },
      { title: 'Predictor import', summary: 'Bring in production and weather-related predictors for analysis.', meta: 'Ready', tone: 'success' },
      { title: 'Footprint import', summary: 'Map footprint tool data to facility meter groups and equipment.', meta: '1 pending', tone: 'warning' }
    ],
    activity: ['Facility readings uploaded', 'Predictor file mapped', 'Footprint meter group mapping queued']
  }
};

const makePanel = (content: typeof accountContent.home) => ({
  help: [
    `${content.title} keeps related VERIFI work in one workspace instead of splitting setup and evaluation modes.`,
    'Use the left rail for major sections and the second sidebar for shallow navigation within the current section.',
    'The support panel updates as the active section and account or facility context changes.'
  ],
  todos: content.cards.filter(card => card.tone === 'warning').length > 0 ? content.cards.filter(card => card.tone === 'warning') : [
    { title: 'No blocking items', summary: 'This section is clear in the current workspace state.', meta: 'Ready', tone: 'success' as const }
  ],
  results: content.metrics,
  details: content.cards
});

export const p1PrototypeData: P1PrototypeData = {
  accounts: [
    {
      id: 'account-example-manufacturing',
      name: 'Example Manufacturing Group',
      industry: 'Fabricated metal products',
      lastModified: 'Aug 8, 2026',
      facilityCount: 3,
      annualEnergy: '48.2M MMBtu/yr',
      annualCost: '$3.84M/yr',
      annualEmissions: '18,420 mtCO2e',
      status: 'Active account'
    },
    {
      id: 'account-riverbend',
      name: 'Riverbend Components',
      industry: 'Automotive parts',
      lastModified: 'Jul 29, 2026',
      facilityCount: 2,
      annualEnergy: '21.4M MMBtu/yr',
      annualCost: '$1.66M/yr',
      annualEmissions: '7,980 mtCO2e',
      status: 'Needs setup'
    }
  ],
  facilities: [
    {
      id: 'facility-north-plant',
      accountId: 'account-example-manufacturing',
      name: 'North Plant',
      location: 'Cleveland, OH',
      status: 'Analysis ready',
      meters: 8,
      predictors: 5,
      analyses: 3,
      annualEnergy: '16.8M MMBtu/yr',
      annualCost: '$1.42M/yr',
      footprint: '72% mapped'
    },
    {
      id: 'facility-south-works',
      accountId: 'account-example-manufacturing',
      name: 'South Works',
      location: 'Knoxville, TN',
      status: 'Weather review',
      meters: 10,
      predictors: 4,
      analyses: 2,
      annualEnergy: '19.6M MMBtu/yr',
      annualCost: '$1.51M/yr',
      footprint: '81% mapped'
    },
    {
      id: 'facility-west-fabrication',
      accountId: 'account-example-manufacturing',
      name: 'West Fabrication',
      location: 'Reno, NV',
      status: 'Setup draft',
      meters: 6,
      predictors: 3,
      analyses: 2,
      annualEnergy: '11.8M MMBtu/yr',
      annualCost: '$910k/yr',
      footprint: '54% mapped'
    }
  ],
  welcomeActions: [
    {
      title: 'Create New Account',
      summary: 'Start setup for an account, facilities, meters, predictors, analyses, reports, and backup preferences.',
      icon: 'fa-plus',
      tone: 'primary',
      cta: 'Create account'
    },
    {
      title: 'Upload Account Backup',
      summary: 'Restore or share an existing VERIFI account backup file from another system.',
      icon: 'fa-upload',
      tone: 'secondary',
      cta: 'Upload backup'
    },
    {
      title: 'Load Example Account',
      summary: 'Open a representative manufacturing account and explore the full workspace concept.',
      icon: 'fa-file-circle-plus',
      tone: 'success',
      cta: 'Load example'
    }
  ],
  sections: [
    { id: 'home', label: 'Home', shortLabel: 'Home', icon: 'fa-house' },
    { id: 'data', label: 'Data', shortLabel: 'Data', icon: 'fa-database' },
    { id: 'visualization', label: 'Visualization', shortLabel: 'Visuals', icon: 'fa-chart-line' },
    { id: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: 'fa-chart-simple' },
    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'fa-file-lines' },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'fa-gear', utility: true },
    { id: 'imports', label: 'Imports & Backup', shortLabel: 'Imports', icon: 'fa-file-arrow-up', utility: true }
  ],
  nav: {
    account: {
      home: [
        { title: 'Workspace', items: [{ id: 'overview', label: 'Overview', meta: 'Portfolio' }, { id: 'progress', label: 'Setup progress', status: 'success' }, { id: 'activity', label: 'Recent activity' }] }
      ],
      data: [
        { title: 'Portfolio Data', items: [{ id: 'facilities', label: 'Facilities', meta: '3 active' }, { id: 'meters', label: 'Meters', meta: '24 total' }, { id: 'readings', label: 'Meter readings', status: 'warning' }] },
        { title: 'Context Data', items: [{ id: 'predictors', label: 'Predictors' }, { id: 'weather', label: 'Weather data' }, { id: 'equipment', label: 'Energy-use equipment', status: 'warning' }] }
      ],
      visualization: [
        { title: 'Explore', items: [{ id: 'time-series', label: 'Time series' }, { id: 'trends', label: 'Utility trends' }, { id: 'compare', label: 'Facility comparison' }] }
      ],
      analysis: [
        { title: 'Account Analysis', items: [{ id: 'rollup', label: 'Account rollup', status: 'warning' }, { id: 'savings', label: 'Savings summary' }, { id: 'footprint-analysis', label: 'Footprint analysis' }] }
      ],
      reports: [
        { title: 'Reports', items: [{ id: 'setup', label: 'Report setup' }, { id: 'data-checks', label: 'Data checks', status: 'warning' }, { id: 'generated', label: 'Generated reports' }, { id: 'footprint-report', label: 'Footprint outputs' }] }
      ],
      settings: [
        { title: 'Account Settings', items: [{ id: 'profile', label: 'Account profile' }, { id: 'fuels', label: 'Custom fuels' }, { id: 'emissions', label: 'Emissions factors', status: 'warning' }, { id: 'gwp', label: 'GWP factors' }] }
      ],
      imports: [
        { title: 'Import', items: [{ id: 'template', label: 'Upload template' }, { id: 'general', label: 'Upload general file' }, { id: 'backup', label: 'Upload account backup' }] },
        { title: 'Backup', items: [{ id: 'export', label: 'Export account' }, { id: 'example', label: 'Load example account' }] }
      ]
    },
    facility: {
      home: [
        { title: 'Facility Workspace', items: [{ id: 'overview', label: 'Overview' }, { id: 'progress', label: 'Facility progress', status: 'warning' }, { id: 'activity', label: 'Recent activity' }] }
      ],
      data: [
        { title: 'Utility Data', items: [{ id: 'meters', label: 'Meters' }, { id: 'readings', label: 'Meter readings', status: 'warning' }, { id: 'groups', label: 'Meter groups' }] },
        { title: 'Drivers and Equipment', items: [{ id: 'predictors', label: 'Predictors' }, { id: 'weather', label: 'Weather data' }, { id: 'equipment', label: 'Energy-use equipment', status: 'warning' }] }
      ],
      visualization: [
        { title: 'Facility Charts', items: [{ id: 'time-series', label: 'Time series' }, { id: 'correlation', label: 'Correlation plots' }, { id: 'heatmap', label: 'Heatmaps', status: 'warning' }] }
      ],
      analysis: [
        { title: 'Facility Analysis', items: [{ id: 'setup', label: 'Analysis setup', status: 'warning' }, { id: 'results', label: 'Results' }, { id: 'footprint-analysis', label: 'Footprint analysis' }] }
      ],
      reports: [
        { title: 'Facility Reports', items: [{ id: 'overview-report', label: 'Overview report' }, { id: 'analysis-report', label: 'Analysis report' }, { id: 'quality-report', label: 'Data quality report', status: 'warning' }, { id: 'footprint-report', label: 'Footprint output' }] }
      ],
      settings: [
        { title: 'Facility Settings', items: [{ id: 'profile', label: 'Facility profile' }, { id: 'preferences', label: 'Preferences' }, { id: 'inherited', label: 'Inherited account factors' }] }
      ],
      imports: [
        { title: 'Facility Import', items: [{ id: 'meter-import', label: 'Meter readings' }, { id: 'predictor-import', label: 'Predictor data' }, { id: 'footprint-import', label: 'Footprint data', status: 'warning' }] },
        { title: 'Backup', items: [{ id: 'account-backup', label: 'Account backup status' }] }
      ]
    }
  },
  content: {
    account: accountContent,
    facility: facilityContent
  },
  panel: {
    account: {
      home: makePanel(accountContent.home),
      data: makePanel(accountContent.data),
      visualization: makePanel(accountContent.visualization),
      analysis: makePanel(accountContent.analysis),
      reports: makePanel(accountContent.reports),
      settings: makePanel(accountContent.settings),
      imports: makePanel(accountContent.imports)
    },
    facility: {
      home: makePanel(facilityContent.home),
      data: makePanel(facilityContent.data),
      visualization: makePanel(facilityContent.visualization),
      analysis: makePanel(facilityContent.analysis),
      reports: makePanel(facilityContent.reports),
      settings: makePanel(facilityContent.settings),
      imports: makePanel(facilityContent.imports)
    }
  }
};
