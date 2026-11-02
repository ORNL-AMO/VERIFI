import { readFileSync } from 'fs';
import { join } from 'path';
import * as routes from './workspace-route';

const account = ['/v1', 'workspace', 'account', 'account-a'];
const facility = ['/v1', 'workspace', 'facility', 'facility-a'];

describe('pure workspace routes', () => {
  it.each([
    ['account Home', () => routes.accountRoute('account-a'), [...account, 'home', 'overview']],
    ['account Settings', () => routes.accountSettingsRoute('account-a', 'units'), [...account, 'settings', 'units']],
    ['account Data', () => routes.accountDataRoute('account-a'), [...account, 'data', 'portfolio']],
    ['Meters inventory', () => routes.accountPortfolioRoute('account-a', 'meters'), [...account, 'data', 'portfolio', 'meters']],
    ['Predictors inventory', () => routes.accountPortfolioRoute('account-a', 'predictors'), [...account, 'data', 'portfolio', 'predictors']],
    ['Facilities default', () => routes.accountPortfolioRoute('account-a'), [...account, 'data', 'portfolio', 'facilities']],
    ['Upload', () => routes.accountImportsRoute('account-a'), [...account, 'imports', 'upload']],
    ['account Reports', () => routes.accountReportsRoute('account-a'), [...account, 'reports', 'dashboard']],
    ['account report stage', () => routes.accountReportWorkbenchRoute('account-a', 'report-a', 'data-checks'), [...account, 'reports', 'workbench', 'report-a', 'data-checks']],
    ['facility report default', () => routes.facilityReportWorkbenchRoute('facility-a', 'report-a'), [...facility, 'reports', 'workbench', 'report-a', 'setup']],
    ['account Analysis', () => routes.accountAnalysisRoute('account-a'), [...account, 'analysis', 'dashboard']],
    ['account analysis default', () => routes.accountAnalysisWorkbenchRoute('account-a', 'analysis-a'), [...account, 'analysis', 'workbench', 'analysis-a', 'setup']],
    ['account analysis Results', () => routes.accountAnalysisResultsRoute('account-a', 'analysis-a', 'facility-contributions'), [...account, 'analysis', 'workbench', 'analysis-a', 'results', 'facility-contributions']],
    ['facility Home', () => routes.facilityRoute('facility-a'), [...facility, 'home', 'overview']],
    ['facility Data tool', () => routes.facilityDataToolRoute('facility-a', 'meter-grouping'), [...facility, 'data', 'meter-grouping']],
    ['facility Settings', () => routes.facilitySettingsRoute('facility-a', 'goals'), [...facility, 'settings', 'goals']],
    ['explicit facility Backup', () => routes.facilitySettingsRoute('facility-a', 'backup'), [...facility, 'settings', 'backup']],
    ['facility analysis', () => routes.facilityAnalysisWorkbenchRoute('facility-a', 'analysis-a', 'used-by'), [...facility, 'analysis', 'workbench', 'analysis-a', 'used-by']],
    ['analysis group', () => routes.facilityAnalysisGroupRoute('facility-a', 'analysis-a', 'group-a', 'banking'), [...facility, 'analysis', 'workbench', 'analysis-a', 'group', 'group-a', 'banking']],
    ['facility analysis Results', () => routes.facilityAnalysisResultsRoute('facility-a', 'analysis-a', 'monthly-chart'), [...facility, 'analysis', 'workbench', 'analysis-a', 'facility', 'monthly-chart']],
    ['meter readings', () => routes.facilityMeterRoute('facility-a', 'meter-a', 'readings'), [...facility, 'data', 'meters', 'meter-a', 'readings']],
    ['meter default', () => routes.facilityMeterRoute('facility-a', 'meter-a'), [...facility, 'data', 'meters', 'meter-a', 'settings']],
    ['meter group default', () => routes.facilityMeterGroupRoute('facility-a', 'group-a'), [...facility, 'data', 'meter-grouping', 'group-a', 'monthly-table']],
    ['Predictor quality', () => routes.facilityPredictorRoute('facility-a', 'predictor-a', 'quality'), [...facility, 'data', 'predictors', 'predictor-a', 'quality']],
    ['Weather creation', () => routes.facilityWeatherPredictorCreateRoute('facility-a'), [...facility, 'data', 'predictors', 'weather', 'new']],
    ['Weather readings', () => routes.facilityWeatherPredictorRoute('facility-a', 'station:station-a', 'readings'), [...facility, 'data', 'predictors', 'weather', 'station:station-a', 'readings']],
    ['Weather output quality', () => routes.facilityWeatherPredictorQualityRoute('facility-a', 'station:station-a', 'predictor-a'), [...facility, 'data', 'predictors', 'weather', 'station:station-a', 'quality', 'predictor-a']]
  ] as const)('builds %s from explicit identities without shell state', (_label, build, expected) => {
    expect(build()).toEqual(expected);
  });

  it.each([
    ['/v1', { view: 'welcome', section: 'home', detail: 'overview' }],
    ['/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b#item', { contextMode: 'account', accountGuid: 'account-a', section: 'data', detail: 'portfolio', portfolioTab: 'meters' }],
    ['/v1/workspace/account/account-a/data/portfolio/unknown', { portfolioTab: 'facilities' }],
    ['/v1/workspace/account/account-a/analysis/workbench/analysis%20a/results/monthly-chart?returnReportAccountGuid=account-a&returnReportGuid=report-a', { analysisGuid: 'analysis a', accountAnalysisStageScope: 'results', accountAnalysisResultTab: 'monthly-chart' }],
    ['/v1/workspace/account/account-a/analysis/workbench/analysis-a', { accountAnalysisStageScope: 'setup' }],
    ['/v1/workspace/account/account-a/reports/workbench/report-a/report', { reportGuid: 'report-a', reportStage: 'report' }],
    ['/v1/workspace/account/account-a/settings/backup', { section: 'settings', detail: 'backup' }],
    ['/v1/workspace/account/account-a/imports/file/draft%201/meter-readings', { importFileId: 'draft 1', importStep: 'meter-readings' }],
    ['/v1/workspace/facility/facility-a/data/meters/meter-a/readings', { contextMode: 'facility', facilityGuid: 'facility-a', meterGuid: 'meter-a', section: 'data', detail: 'meters' }],
    ['/v1/workspace/facility/facility-a/data/meter-grouping/group-a/yearly', { meterGroupGuid: 'group-a' }],
    ['/v1/workspace/facility/facility-a/data/predictors/predictor-a/settings', { predictorGuid: 'predictor-a', weatherPredictorGroupKey: undefined }],
    ['/v1/workspace/facility/facility-a/data/predictors/weather/station%3Astation-a/quality/predictor-a', { predictorGuid: undefined, weatherPredictorGroupKey: 'station:station-a' }],
    ['/v1/workspace/facility/facility-a/data/predictors/weather/new', { weatherPredictorGroupKey: undefined, predictorGuid: undefined }],
    ['/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/group/group-a/regression', { analysisGuid: 'analysis-a', analysisGroupGuid: 'group-a', analysisStageScope: 'group' }],
    ['/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/facility/annual', { analysisStageScope: 'facility' }],
    ['/v1/workspace/facility/facility-a/reports/workbench/report-a/data-checks', { reportGuid: 'report-a', reportStage: 'data-checks' }],
    ['/v1/workspace/facility/facility-a/settings/units', { section: 'settings', detail: 'units' }],
    ['/v1/workspace/facility/facility-a/data/predictors/bad%value/settings', { predictorGuid: 'bad%value' }]
  ] as const)('parses %s without changing scope or return-origin queries', (url, expected) => {
    expect(routes.parseWorkspaceRoute(url)).toMatchObject(expected);
  });

  it('recognizes only account inventories and serializes their explicit scope', () => {
    expect(routes.parseWorkspaceRoute('/v1/workspace/account/account-a/data/portfolio/meters?facility=facility-b').facilityGuid).toBeUndefined();
    expect(routes.isAccountInventory(routes.parseWorkspaceRoute('/v1/workspace/account/account-a/analysis/dashboard'))).toBe(true);
    expect(routes.isAccountInventory(routes.parseWorkspaceRoute('/v1/workspace/account/account-a/reports/workbench/report-a/setup'))).toBe(false);
    expect(routes.isAccountInventory(routes.parseWorkspaceRoute('/v1/workspace/facility/facility-a/data/meters/meter-a/settings'))).toBe(false);
    expect(routes.facilityScopeQuery(routes.ALL_FACILITIES)).toEqual({});
    expect(routes.facilityScopeQuery({ kind: 'facility', facilityGuid: 'facility-b' })).toEqual({ facility: 'facility-b' });
  });

  it('has no runtime imports or dependency on shell/workspace implementations', () => {
    const source = readFileSync(join(__dirname, 'workspace-route.ts'), 'utf8');
    expect(source.match(/^import(?! type\b).*$/gm) ?? []).toEqual([]);
    expect(source).not.toMatch(/\.service['"]|\binject\s*\(|@Injectable/);
  });
});
