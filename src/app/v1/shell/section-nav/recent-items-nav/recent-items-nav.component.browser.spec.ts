import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { reportFixture } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { setupFacilityScopeNavigation } from '../../facility-scope-navigation.testing';
import { SectionNavModule } from '../section-nav.module';
import { SectionNavComponent } from '../section-nav.component';
import { RecentItemsService } from '../recent-items.service';

describe('account sidebar Recents in Chromium', () => {
  it('shows bounded facility shortcuts with secondary facility labels and keeps account items, ownership, guards and keyboard access', async () => {
    await page.viewport(1100, 850);
    TestBed.configureTestingModule({ imports: [SectionNavModule] });
    const { navigation, router, store, fixture, canLeave } = await setupFacilityScopeNavigation('/v1/workspace/account/account-a/analysis/dashboard');
    const base = store.snapshot()!;
    const analyses = Array.from({ length: 7 }, (_, index) => ({ guid: `analysis-${index}`, name: `Production ${index} — A long manufacturing and process improvement analysis`,
      accountId: base.account.guid, facilityId: base.facilities[index % 2].guid, analysisCategory: 'energy', groups: [] } as IdbAnalysisItem));
    store.publish({ ...base, facilityAnalyses: analyses,
      accountAnalyses: [{ guid: 'account-analysis', accountId: base.account.guid, analysisCategory: 'energy', name: 'Account energy', facilityAnalysisItems: [] } as IdbAccountAnalysisItem],
      accountReports: [{ ...getNewIdbAccountReport(base.account, [...base.facilities], []), guid: 'account-report', name: 'Account report', reportType: 'analysis' }],
      facilityReports: [reportFixture({ guid: 'recent-report', facilityId: base.facilities[1].guid, name: 'Facility annual report' })] });
    const sidebar = TestBed.createComponent(SectionNavComponent);
    const root = sidebar.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.cssText = 'width:min(280px,100%);height:760px';
    const settle = async () => { fixture.detectChanges(); sidebar.detectChanges(); await sidebar.whenStable(); sidebar.detectChanges(); };
    try {
      await settle(); expect(root.querySelector('app-recent-items-nav')).toBeNull();
      for (const analysis of analyses.slice(0, 2)) {
        await router.navigate(navigation.facilityAnalysisWorkbenchRoute(analysis.facilityId, analysis.guid)); await settle();
        expect(root.querySelector('app-recent-items-nav')).toBeNull();
      }
      canLeave.set(false);
      expect(await router.navigate(navigation.facilityAnalysisWorkbenchRoute(analyses[2].facilityId, analyses[2].guid))).toBe(false);
      expect(TestBed.inject(RecentItemsService).analyses().map(item => item.guid)).toEqual(['analysis-1', 'analysis-0']);
      canLeave.set(true);
      for (const analysis of analyses.slice(2)) { await router.navigate(navigation.facilityAnalysisWorkbenchRoute(analysis.facilityId, analysis.guid)); await settle(); }
      await router.navigate(navigation.accountAnalysisRoute(base.account.guid)); await settle();
      const recents = root.querySelector<HTMLElement>('app-recent-items-nav')!;
      expect(recents.textContent).toContain('Recents'); expect(recents.querySelectorAll('a')).toHaveLength(5);
      expect(root.textContent).toContain('Account energy');
      const latest = analyses[6], first = recents.querySelector<HTMLAnchorElement>('a')!;
      expect(first.getAttribute('aria-label')).toBe(`${latest.name}, ${base.facilities[0].name}`);
      expect(first.querySelector('.recent-items__facility')?.textContent).toContain(base.facilities[0].name);
      expect(first.querySelector('app-ui-icon[name="facility"]')).not.toBeNull();
      const primary = first.querySelector<HTMLElement>('.recent-items__name')!, secondary = first.querySelector<HTMLElement>('.recent-items__facility')!;
      expect(primary.getBoundingClientRect().bottom).toBeLessThanOrEqual(secondary.getBoundingClientRect().top);
      expect(Number(getComputedStyle(secondary).fontWeight)).toBeLessThan(Number(getComputedStyle(primary).fontWeight));
      const panel = root.querySelector<HTMLElement>('.v1-nav')!;
      for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) {
        root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`; await settle();
        expect(textContrast(primary, panel)).toBeGreaterThanOrEqual(4.5); expect(textContrast(secondary, panel)).toBeGreaterThanOrEqual(4.5);
      }
      root.className = 'v1-root';
      await page.screenshot({ element: root, path: '../../../../../../.angular/recents-analysis-wide.png' });
      await page.viewport(390, 844); await settle(); expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
      first.focus(); await userEvent.keyboard('{Enter}'); await settle();
      expect(navigation.contextFacility()?.guid).toBe(latest.facilityId); expect(navigation.activeAnalysisGuid()).toBe(latest.guid);
      expect(root.querySelector('app-recent-items-nav')).toBeNull();
      await router.navigate(navigation.facilityReportWorkbenchRoute(base.facilities[1].guid, 'recent-report')); await settle();
      await router.navigate(navigation.accountReportsRoute(base.account.guid)); await settle();
      const reportRecents = root.querySelector<HTMLElement>('app-recent-items-nav')!;
      expect(reportRecents.querySelectorAll('a')).toHaveLength(1); expect(reportRecents.textContent).toContain('Facility annual report');
      expect(reportRecents.textContent).toContain(base.facilities[1].name); expect(root.textContent).toContain('Account report');
      await page.screenshot({ element: root, path: '../../../../../../.angular/recents-reports-narrow.png' });
    } finally { sidebar.destroy(); fixture.destroy(); }
  });
});
