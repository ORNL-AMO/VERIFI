import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { VisualizationNavigationService } from './visualization-navigation.service';
import { visualizationSnapshot } from './testing/visualization-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import type { MeterResultsChartPresentation } from '@app/v1/shared/charts/metric-results-chart.models';

// Creation and ordinary entry use the same navigation; accordion defaults belong to the workbench.
describe('visualization navigation', () => {
  it('restores the selected capture when the same meter was captured with different controls later', async () => {
    const { service } = setup();
    const presentation: MeterResultsChartPresentation = { leftMetricId: 'energyUse', leftDisplay: 'bar', rightDisplay: 'off', leftTraceType: 'bar', rightTraceType: 'line', hiddenMetricIds: [], zoom: { start: 25, end: 75 }, smoothLines: true, legend: true };
    const first = { facilityGuid: 'facility-a', meterGuid: 'meter-a', presentation, scrollTop: 240 };
    const later = { ...first, presentation: { ...presentation, leftDisplay: 'line' as const, zoom: { start: 0, end: 100 } }, scrollTop: 0 };
    service.rememberMonthlyMeter('account-a', 'first', first); service.rememberMonthlyMeter('account-a', 'later', later);
    const snapshot = { ...visualizationSnapshot(), meters: [meter({})] };
    expect(await service.returnToMonthlyMeter('account-a', 'first', snapshot)).toBe(true);
    expect(service.monthlyMeterView('account-a', 'facility-a', 'meter-a')).toEqual(first);
    expect(await service.returnToMonthlyMeter('account-a', 'later', snapshot)).toBe(true);
    expect(service.monthlyMeterView('account-a', 'facility-a', 'meter-a')).toEqual(later);
  });
  it('keeps capture returns per account and definition, restores source state and rejects deleted or foreign destinations', async () => {
    const { service, navigate } = setup();
    const presentation: MeterResultsChartPresentation = { leftMetricId: 'energyUse', leftDisplay: 'bar', rightDisplay: 'off', leftTraceType: 'bar', rightTraceType: 'line', hiddenMetricIds: [], zoom: { start: 25, end: 75 }, smoothLines: true, legend: true };
    const context = { facilityGuid: 'facility-a', meterGuid: 'meter-a', presentation, scrollTop: 240 };
    service.rememberMonthlyMeter('account-a', 'chart-a', context);
    service.rememberMonthlyMeter('account-a', 'chart-b', { ...context, meterGuid: 'meter-b' });
    const snapshot = { ...visualizationSnapshot(), meters: [meter({})] };
    expect(service.monthlyMeterReturn('account-b', 'chart-a')).toBeUndefined();
    expect(service.monthlyMeterReturn('account-a', 'chart-a')).toEqual(context);
    expect(service.monthlyMeterView('account-a', 'facility-a', 'meter-a')).toEqual(context);
    expect(await service.returnToMonthlyMeter('account-a', 'chart-a', snapshot)).toBe(true);
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters', 'meter-a', 'monthly-chart']);
    expect(await service.returnToMonthlyMeter('account-a', 'chart-b', snapshot)).toBe(false);
    expect(await service.returnToMonthlyMeter('account-a', 'chart-a', { ...snapshot, facilities: [] })).toBe(false);
    expect(await service.returnToMonthlyMeter('account-b', 'chart-a', snapshot)).toBe(false);
    expect(navigate).toHaveBeenCalledOnce();
  });
  function setup() {
    const navigate = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    return { service: TestBed.inject(VisualizationNavigationService), navigate };
  }

  it('opens the saved visualization for its account and identity', async () => {
    const { service, navigate } = setup();
    await expect(service.open('account-a', 'chart-a')).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'workbench', 'chart-a']);
  });

  it('preserves navigation cancellation and errors', async () => {
    const { service, navigate } = setup();
    navigate.mockResolvedValueOnce(false);
    await expect(service.open('account-a', 'chart-a')).resolves.toBe(false);
    navigate.mockRejectedValueOnce(new Error('navigation failed'));
    await expect(service.open('account-a', 'chart-a')).rejects.toThrow('navigation failed');
  });

  it('returns to the remembered facility independently for each account', async () => {
    const { service, navigate } = setup();
    service.rememberReturn('account-a', 'facility-a');
    await service.returnToDashboard('account-a');
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'dashboard'], { queryParams: { facility: 'facility-a' } });
    await service.returnToDashboard('account-b');
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'account', 'account-b', 'visualization', 'dashboard'], { queryParams: {} });
  });
});
