import { ApplicationRef, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { ANALYSIS_DATA_CHECKS_VERSION } from '@data/models/analysis-review';
import { JStatRegressionModel } from '@data/models/analysis';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AnalysisReportCalculationService } from './analysis-report-calculation.service';
import { AnalysisChecksController, AnalysisChecksRequest } from './analysis-checks-controller';

async function settle() { TestBed.tick(); await TestBed.inject(ApplicationRef).whenStable(); TestBed.tick(); }
function setup(years = [2023]) {
  const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
  const request = signal<AnalysisChecksRequest>({ key: 'report', state: 'calculate', demand: 'checks', inputs, years, reviews: [] });
  const execute = vi.fn(args => of({ ok: true, operation: 'checks', value: args.years.map(year => calculateAnalysisDataChecks(args.inputs, year)) }));
  const persist = vi.fn(async displayed => {
    request.update(value => ({ ...value, reviews: displayed.years.map((reportYear, index) => ({ checksVersion: ANALYSIS_DATA_CHECKS_VERSION,
      reportYear, inputFingerprint: displayed.fingerprints[index], reviewedAt: '2026-01-01T00:00:00Z' })) }));
  });
  TestBed.configureTestingModule({ providers: [{ provide: AnalysisReportCalculationService, useValue: { execute, fingerprint: async value => value } }] });
  const controller = TestBed.runInInjectionContext(() => new AnalysisChecksController(computed(() => request()), persist));
  return { controller, request, inputs, execute, persist };
}

describe('shared analysis checks workflow', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('completes clean periods without acknowledgment or writes and reuses checks across demands', async () => {
    const { controller, request, execute, persist } = setup([2024, 2023]); await settle();
    expect(controller.workflow()).toMatchObject({ completed: true, canConfirm: false });
    expect(controller.state().value?.reviewed).toBe(false);
    await controller.confirmReview(); expect(persist).not.toHaveBeenCalled();
    request.update(value => ({ ...value, demand: 'gate' })); await settle();
    expect(controller.workflow().completed).toBe(true); expect(execute).toHaveBeenCalledOnce();
    request.update(value => ({ ...value, demand: 'freshness' })); await settle();
    expect(controller.workflow().completed).toBe(true); expect(execute).toHaveBeenCalledOnce();
  });
  it('checks freshness in Setup without starting a calculation and accepts matching receipts at the report gate', async () => {
    const { controller, request, inputs, execute } = setup();
    request.update(value => ({ ...value, demand: 'freshness' })); await settle();
    expect(controller.workflow().completed).toBe(false); expect(execute).not.toHaveBeenCalled();
    request.update(value => ({ ...value, demand: 'gate', reviews: [{ checksVersion: ANALYSIS_DATA_CHECKS_VERSION,
      reportYear: 2023, inputFingerprint: analysisReviewContent(inputs, 2023), reviewedAt: '2026-01-01T00:00:00Z' }] }));
    await settle(); expect(controller.workflow().completed).toBe(true); expect(execute).not.toHaveBeenCalled();
  });
  it('requires acknowledgment for report warnings, disables duplicate saves, and shares saved freshness', async () => {
    const { controller, request, persist } = setup(); request.update(value => ({ ...value, warnings: true })); await settle();
    expect(controller.workflow()).toMatchObject({ completed: false, canConfirm: true });
    const saving = controller.confirmReview();
    expect(controller.workflow()).toMatchObject({ saving: true, canConfirm: false, completed: false });
    await controller.confirmReview(); await saving; await settle(); expect(persist).toHaveBeenCalledOnce();
    expect(controller.workflow().completed).toBe(true);
    request.update(value => ({ ...value, key: 'another-report', demand: 'gate' })); await settle();
    expect(controller.workflow().completed).toBe(true);
  });
  it.each(['critical', 'moderate', 'minor', 'validation-flag'] as const)('recognizes %s model issues', async severity => {
    const { controller, execute } = setup();
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    const group = check.groups[0];
    if (severity === 'validation-flag') Object.assign(group, { model: { isValid: true, SEPValidationPass: false, SEPValidation: [] } as JStatRegressionModel });
    else Object.assign(group, { [severity]: ['Review this issue'] });
    execute.mockReturnValue(of({ ok: true, operation: 'checks', value: [check] })); await settle();
    expect(controller.workflow()).toMatchObject({ completed: false, canConfirm: severity !== 'critical', blocked: severity === 'critical' });
  });
  it.each(['missing-period', 'empty', 'blocking-finding'] as const)('blocks %s rather than treating it as clean', async scenario => {
    const { controller, request, execute, persist } = setup([2024, 2023]);
    const check = calculateAnalysisDataChecks(buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), 2023);
    if (scenario === 'empty') execute.mockReturnValue(of({ ok: true, operation: 'checks', value: [] }));
    if (scenario === 'missing-period') execute.mockReturnValue(of({ ok: true, operation: 'checks', value: [check] }));
    if (scenario === 'blocking-finding') request.update(value => ({ ...value, blocking: true }));
    await settle(); expect(controller.workflow()).toMatchObject({ completed: false, canConfirm: false, blocked: true });
    await controller.confirmReview(); expect(persist).not.toHaveBeenCalled();
  });
  it('keeps failed acknowledgment retryable and suppresses errors after dependency changes', async () => {
    const { controller, request, persist, inputs } = setup(); request.update(value => ({ ...value, warnings: true })); await settle();
    persist.mockRejectedValueOnce(new Error('Disk full')); await controller.confirmReview();
    expect(controller.workflow()).toMatchObject({ completed: false, canConfirm: true, error: 'Disk full' });
    const changed = structuredClone(inputs); changed.meterData[0].totalEnergyUse += 5;
    request.update(value => ({ ...value, inputs: changed }));
    expect(controller.workflow()).toMatchObject({ completed: false, canConfirm: false, error: undefined });
    await settle(); await controller.confirmReview(); await settle(); expect(controller.workflow().completed).toBe(true);
  });
  it('invalidates immediately and cancels obsolete checks before accepting a replacement', async () => {
    const { controller, request, execute, inputs } = setup();
    const first = new Subject<any>(); execute.mockReturnValueOnce(first); await settle(); expect(first.observed).toBe(true);
    const changed = structuredClone(inputs); changed.meterData[0].totalEnergyUse += 5;
    request.update(value => ({ ...value, inputs: changed }));
    expect(controller.state().value).toBeUndefined(); await settle();
    expect(first.observed).toBe(false); expect(controller.workflow().completed).toBe(true);
    request.update(value => ({ ...value, state: 'waiting', message: 'Workspace pending' }));
    expect(controller.workflow().completed).toBe(false); await settle();
  });
  it('does not accept a receipt that covers only some requested periods', async () => {
    const { controller, request, inputs } = setup([2024, 2023]);
    request.update(value => ({ ...value, warnings: true, reviews: [{ checksVersion: ANALYSIS_DATA_CHECKS_VERSION,
      reportYear: 2023, inputFingerprint: analysisReviewContent(inputs, 2023), reviewedAt: '2026-01-01T00:00:00Z' }] }));
    await settle(); expect(controller.state().value?.reviewed).toBe(false); expect(controller.workflow().canConfirm).toBe(true);
  });
});
