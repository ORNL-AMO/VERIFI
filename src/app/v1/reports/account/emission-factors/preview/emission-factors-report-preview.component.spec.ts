import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { ReportResultState } from '@app/v1/reports/shared/calculation/report-result-state';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';
import { accountEmissionFactorsOutputSnapshot } from '../testing/emission-factors-fixtures';
import { AccountEmissionFactorsReportModule } from '../emission-factors-report.module';
import { AccountEmissionFactorsReportService } from '../emission-factors-report.service';
import { AccountEmissionFactorsReportPreviewComponent } from './emission-factors-report-preview.component';

describe('account Emission Factors preview', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('qualifies facilities, retains empty guidance, and replaces stale tables with retry feedback', async () => {
    const value = accountEmissionFactorsOutputSnapshot().results;
    const state = signal<ReportResultState<readonly FacilityEmissionFactorsResult[]>>({ key: 'report', state: 'ready', value });
    const report = { state, editor: { draft: () => ({ name: 'Factors' }) }, retry: vi.fn() };
    await TestBed.configureTestingModule({ imports: [AccountEmissionFactorsReportModule], providers: [ReportPresentationController,
      { provide: AccountEmissionFactorsReportService, useValue: report }] }).compileComponents();
    const fixture = TestBed.createComponent(AccountEmissionFactorsReportPreviewComponent); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('table')).toHaveLength(3);
    const cards = [...root.querySelectorAll('.report-document')];
    expect(cards).toHaveLength(3);
    expect(cards.map(card => card.querySelectorAll('table').length)).toEqual([2, 1, 0]);
    expect(cards[0].textContent).toContain('Electricity Emission Factors');
    expect(cards[0].textContent).toContain('Other Emission Factors');
    expect(cards.map(card => card.querySelector('.facility-heading')?.textContent?.trim()))
      .toEqual(value.map(result => result.facility.name));
    expect(root.querySelectorAll('.document-title')).toHaveLength(1);
    expect(root.textContent).toContain('Second facility'); expect(root.textContent).toContain('no meters with applicable emission factors');
    const ids = [...root.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length); expect(fixture.componentInstance.canPresent()).toBe(true);
    state.set({ key: 'report', state: 'waiting', message: 'Waiting for saved settings' }); fixture.detectChanges();
    expect(root.querySelector('table')).toBeNull(); expect(root.querySelector('[role="status"]')?.textContent).toContain('Waiting');
    expect(fixture.componentInstance.canPresent()).toBe(false);
    state.set({ key: 'report', state: 'error', message: 'Unavailable' }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button')!.click(); expect(report.retry).toHaveBeenCalledOnce();
    state.set({ key: 'report', state: 'ready', value: value.map(result => ({ ...result, electricity: [], other: [] })) }); fixture.detectChanges();
    expect(root.querySelector('table')).toBeNull(); expect(fixture.componentInstance.canPresent()).toBe(false);
  });
});
