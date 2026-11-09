import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { FacilityAnalysisDetailsResultsService } from '@app/v1/analysis/facility/details/facility-analysis-details-results.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from './account-analysis-facility-selection.service';
import { AccountAnalysisFacilitySelectionItem } from './account-analysis-facility-selection.models';
import { AccountAnalysisSelectFacilityItemsComponent } from './account-analysis-select-facility-items.component';

async function setup() {
  const account = { ...getNewIdbAccount(), guid: 'account-a' };
  const facilities = Array.from({ length: 30 }, (_, index) => ({
    ...getNewIdbFacility(account), guid: `facility-${index}`, name: `Facility ${String(index).padStart(2, '0')}`,
    color: '#336699'
  }));
  const items: AccountAnalysisFacilitySelectionItem[] = facilities.map(facility => ({
    facility, analysisItemId: 'skip', eligible: false, assigned: true, state: 'skipped'
  }));
  const activeFacilityGuid = signal(facilities[0].guid);
  const activeItem = computed(() => items.find(item => item.facility.guid === activeFacilityGuid())!);
  const selection = {
    selectionItems: signal(items), activeItem, activeFacility: computed(() => activeItem().facility),
    activeFacilityGuid, analysis: signal(getNewIdbAccountAnalysisItem('energy', account, facilities)),
    validCount: signal(items.length), candidates: signal([]), selectedCandidate: signal(undefined),
    detailCards: signal([]), canMutate: signal(true), busy: signal(false), error: signal(undefined),
    selectFacility: (guid: string) => activeFacilityGuid.set(guid), skipFacility: vi.fn(),
    selectAnalysis: vi.fn(), clearError: vi.fn(), createFacilityAnalysis: vi.fn(), openFacilityAnalysis: vi.fn()
  } satisfies Pick<AccountAnalysisFacilitySelectionService,
    'selectionItems' | 'activeItem' | 'activeFacility' | 'activeFacilityGuid' | 'analysis' | 'validCount'
    | 'candidates' | 'selectedCandidate' | 'detailCards' | 'canMutate' | 'busy' | 'error' | 'selectFacility'
    | 'skipFacility' | 'selectAnalysis' | 'clearError' | 'createFacilityAnalysis' | 'openFacilityAnalysis'>;
  TestBed.overrideComponent(AccountAnalysisSelectFacilityItemsComponent, {
    set: { providers: [{ provide: FacilityAnalysisDetailsResultsService, useValue: { state: signal({ state: 'idle' }) } }] }
  });
  await TestBed.configureTestingModule({
    imports: [AccountAnalysisSelectFacilityItemsComponent],
    providers: [
      { provide: AccountAnalysisFacilitySelectionService, useValue: selection },
      { provide: AccountAnalysisWorkbenchContext, useValue: {
        linkedReports: signal([]), status: { state: signal('ready') },
        workspace: { canWrite: signal(true), meterGroups: signal([]) }
      } }
    ]
  }).compileComponents();
  const fixture = TestBed.createComponent(AccountAnalysisSelectFacilityItemsComponent);
  const root = fixture.nativeElement as HTMLElement;
  root.style.cssText = 'display:flex;height:360px;width:100%;min-width:0';
  root.className = 'v1-root';
  await settle(fixture);
  return { fixture, root, selection };
}

async function settle(fixture: ComponentFixture<AccountAnalysisSelectFacilityItemsComponent>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  fixture.detectChanges();
}

describe('Account Analysis member rail in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps a bounded desktop rail and a horizontal narrow rail with keyboard member selection', async () => {
    await page.viewport(1200, 850);
    const { fixture, root, selection } = await setup();
    const rail = root.querySelector<HTMLElement>('nav[aria-label="Facilities"]')!;
    const content = root.querySelector<HTMLElement>('.v1-account-selection__content')!;
    expect(rail.querySelectorAll('button')).toHaveLength(30);
    expect(rail.scrollHeight).toBeGreaterThan(rail.clientHeight);
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth + 1);
    const contentTop = content.scrollTop;
    rail.scrollTop = rail.scrollHeight;
    expect(rail.scrollTop).toBeGreaterThan(0);
    expect(content.scrollTop).toBe(contentTop);

    const last = rail.querySelector<HTMLButtonElement>('button:last-child')!;
    last.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    expect(selection.activeFacilityGuid()).toBe('facility-29');
    expect(last.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement).toBe(last);

    for (const theme of ['', 'v1-theme-dark', 'v1-theme-dark v1-contrast-strong']) {
      await page.viewport(390, 850);
      root.className = `v1-root ${theme}`;
      await settle(fixture);
      expect(rail.scrollWidth).toBeGreaterThan(rail.clientWidth);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      expect(textContrast(last)).toBeGreaterThanOrEqual(4.5);
    }
    const first = rail.querySelector<HTMLButtonElement>('button')!;
    first.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    expect(selection.activeFacilityGuid()).toBe('facility-0');
    expect(first.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement).toBe(first);
    expect(rail.scrollLeft).toBeLessThan(1);
    last.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    expect(selection.activeFacilityGuid()).toBe('facility-29');
    expect(last.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement).toBe(last);
    expect(rail.scrollLeft).toBeGreaterThan(0);
    fixture.destroy();
  });
});
