import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { buildEmissionFactorsInput, calculateEmissionFactors, FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { ReportResultState } from '@app/v1/reports/shared/calculation/report-result-state';
import { EmissionFactorsReportModule } from '../emission-factors-report.module';
import { EmissionFactorsReportService } from '../emission-factors-report.service';
import { EmissionFactorsReportPreviewComponent } from './emission-factors-report-preview.component';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';

describe('Emission Factors report preview', () => {
  it('replaces stale tables with waiting/error feedback and offers retry', async () => {
    const snapshot = emissionFactorsSnapshot();
    const value = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2024 }, emissionFactorsRates()));
    const state = signal<ReportResultState<FacilityEmissionFactorsResult>>({ key: 'report', state: 'ready', value });
    const report = { state, editor: { draft: () => ({ name: 'Factors' }) }, context: { facility: () => snapshot.facilities[0] }, retry: vi.fn() };
    await TestBed.configureTestingModule({ imports: [EmissionFactorsReportModule], providers: [ReportPresentationController, { provide: EmissionFactorsReportService, useValue: report }] }).compileComponents();
    const fixture = TestBed.createComponent(EmissionFactorsReportPreviewComponent); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('table')).toHaveLength(2);
    const categories = [...root.querySelectorAll('.report-document')];
    expect(categories).toHaveLength(2);
    expect(categories.every(category => category.querySelectorAll('table').length === 1)).toBe(true);
    expect(root.querySelectorAll('#emission-factors-report-title')).toHaveLength(1);
    state.set({ key: 'report', state: 'waiting', message: 'Waiting for saved settings' }); fixture.detectChanges();
    expect(root.querySelector('table')).toBeNull(); expect(root.querySelector('[role="status"]')?.textContent).toContain('Waiting');
    state.set({ key: 'report', state: 'error', message: 'Unavailable' }); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('button')!.click(); expect(report.retry).toHaveBeenCalledOnce();
  });
});
