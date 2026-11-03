import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { reportFacility, reportFixture, reportSnapshot } from '../testing/report-test-fixtures';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';

describe('facility report Data Checks', () => {
  it('shows pending checks without changing saved report settings or analysis review metadata', async () => {
    const source = reportFixture({ analysisItemId: 'analysis-a', facilityReportType: 'savings' });
    const original = structuredClone(source);
    const { open, harness, store, updateName } = await setupReportWorkbench([source]);
    store.publish({ ...reportSnapshot([source]), facilityAnalyses: [{ guid: 'analysis-a', facilityId: 'facility-a', accountId: 'account-a',
      name: 'Linked analysis', isAnalysisVisited: false, dataCheckedDate: new Date(2024, 0, 1) } as IdbAnalysisItem] }, { facility: reportFacility });
    const analyses = structuredClone(store.facilityAnalyses());
    await open('report-a', 'data-checks');
    expect(harness.routeNativeElement!.querySelector('app-pending-report-stage')?.textContent).toContain('does not complete checks');
    expect(store.facilityReports()[0]).toEqual(original);
    expect(store.facilityAnalyses()).toEqual(analyses);
    expect(store.committedRevision()).toBeUndefined();
    expect(updateName).not.toHaveBeenCalled();
  });
});


describe('facility report preview foundation', () => {
  it('shows pending availability without claiming successful output or exposing export actions', async () => {
    const { open, harness, updateName } = await setupReportWorkbench([reportFixture({ facilityReportType: 'overview' })]);
    await open('report-a', 'report');
    const content: HTMLElement = harness.routeNativeElement!.querySelector('app-pending-report-stage')!;
    expect(content.textContent).toContain('preview is pending migration');
    expect(content.querySelector('button')).toBeNull();
    expect(content.querySelector('canvas')).toBeNull();
    expect(updateName).not.toHaveBeenCalled();
  });
});
