import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { echarts } from '@app/v1/shared/charts/echarts';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterQualityPresentationComponent } from '@app/v1/shared/data-quality/meter-quality-presentation/meter-quality-presentation.component';
import { DataQualityDotPlotComponent } from '@app/v1/shared/data-quality/data-quality-dot-plot/data-quality-dot-plot.component';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from './meters/facility-meters-workspace.service';
import { MeterWorkbenchQualityReportComponent } from './meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { PREDICTOR_QUALITY_CONTEXT } from './predictors/predictor-quality-context';
import { PredictorWorkbenchQualityReportComponent } from './predictors/predictor-workbench/quality-report/predictor-workbench-quality-report.component';

describe('Workbench quality distributions in Chromium', () => {
  afterEach(async () => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    await page.viewport(1280, 720);
  });

  it.each([
    ['meter', [], 1440],
    ['predictor', ['v1-theme-dark'], 760],
    ['weather', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('renders, interacts with, and disposes %s distributions', async (kind, classes, width) => {
    await page.viewport(width, 1600);
    const selectedMeter = { ...getNewIdbUtilityMeter('facility-a', 'account-a', true, 'kWh'),
      guid: 'meter-a', name: 'Electricity', source: 'Electricity' as const, includeInEnergy: true, energyUnit: 'kWh' };
    const selectedPredictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a',
      name: 'Production', unit: 'units', predictorType: kind === 'weather' ? 'Weather' as const : 'Standard' as const,
      weatherDataType: 'HDD' as const };
    const amounts = [10, 10, 11, 12, 100];
    const meterData = signal(amounts.map((amount, index) => ({ ...getNewIdbUtilityMeterData(selectedMeter, []),
      guid: `meter-reading-${index}`, day: 1, month: index + 1, year: 2024, totalEnergyUse: amount, totalCost: amount * 2 })));
    const predictorData = signal(amounts.map((amount, index) => ({ ...getNewIdbPredictorData(selectedPredictor, []),
      guid: `predictor-reading-${index}`, month: index + 1, year: 2024, amount })));
    const sharedProviders = [
      { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
      { provide: WorkspaceStatusService, useValue: {
        state: signal('ready'), meterFindings: () => [], warningActionError: signal(undefined)
      } }
    ];
    if (kind === 'meter') {
      TestBed.configureTestingModule({
        declarations: [MeterWorkbenchQualityReportComponent, MeterQualityPresentationComponent, DataQualityDotPlotComponent],
        imports: [EChartsChartDirective, IconComponent],
        providers: [...sharedProviders,
          { provide: Router, useValue: { navigate: vi.fn() } },
          { provide: WorkspaceNavigationService, useValue: { facilityMeterRoute: vi.fn() } },
          { provide: FacilityMetersWorkspaceService, useValue: {
            selectedMeter: signal(selectedMeter), selectedMeterData: meterData,
            facility: signal(undefined), account: signal(undefined)
          } }
        ]
      });
    } else {
      TestBed.configureTestingModule({ imports: [PredictorWorkbenchQualityReportComponent],
        providers: [...sharedProviders, { provide: PREDICTOR_QUALITY_CONTEXT, useValue: {
          predictor: signal(selectedPredictor), readings: predictorData, findings: signal([]),
          expectedRangeEnabled: signal(true), idPrefix: signal(`${kind}-quality`),
          settingsLabel: 'Open Settings', openReadings: vi.fn(), openSettings: vi.fn()
        } }]
      });
    }
    const fixture = kind === 'meter' ? TestBed.createComponent(MeterWorkbenchQualityReportComponent)
      : TestBed.createComponent(PredictorWorkbenchQualityReportComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px` });
    fixture.detectChanges();
    const plots = () => [...host.querySelectorAll<HTMLElement>('app-data-quality-dot-plot')];
    expect(plots()).toHaveLength(kind === 'meter' ? 2 : 1);
    const plot = plots()[0], chartHost = plot.querySelector<HTMLElement>('.quality-dot-plot__chart')!;
    await vi.waitFor(() => expect(echarts.getInstanceByDom(chartHost)?.getOption().series).toHaveLength(3));
    const chart = echarts.getInstanceByDom(chartHost)!;
    const series = chart.getOption().series as { data: { value: number[] }[] }[];
    expect(series[0].data).toHaveLength(4);
    expect(series[1].data).toHaveLength(1);
    expect(plot.querySelectorAll('.visually-hidden tbody tr')).toHaveLength(5);
    expect(plot.querySelector('h2')!.getAttribute('aria-level')).toBe('2');
    const [x, y] = chart.convertToPixel({ seriesIndex: 1 }, series[1].data[0].value) as number[];
    await userEvent.hover(chartHost.querySelector('canvas')!, { position: { x, y } });
    await vi.waitFor(() => {
      const tooltip = chartHost.querySelector('.v1-chart-tooltip')?.textContent;
      expect(tooltip).toContain('100');
      expect(tooltip).toContain('Outlier');
      expect(tooltip?.match(/(?:Total Consumption|Predictor Values):/g)).toHaveLength(1);
    });
    chart.dispatchAction({ type: 'hideTip' });
    chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
    expect((chart.getOption().dataZoom as { start: number }[])[0].start).toBe(25);
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    expect(chart.getDataURL({ type: 'png' })).toMatch(/^data:image\/png/);
    const download = vi.spyOn(EChartsChartDirective.prototype, 'downloadPng').mockImplementation(() => {});
    await userEvent.click(plot.querySelector('button')!);
    expect(download).toHaveBeenCalledWith(kind === 'meter' ? 'Electricity-consumption-distribution' : 'production-value-distribution');
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    const chartHosts = plots().map(element => element.querySelector<HTMLElement>('.quality-dot-plot__chart')!);
    if (kind === 'meter') meterData.set(meterData().map(row => ({ ...row, totalEnergyUse: NaN, totalCost: NaN })));
    else predictorData.set(predictorData().map(row => ({ ...row, amount: NaN })));
    fixture.detectChanges();
    await vi.waitFor(() => expect(host.querySelectorAll('.quality-dot-plot__chart')).toHaveLength(0));
    chartHosts.forEach(element => expect(echarts.getInstanceByDom(element)).toBeUndefined());
    fixture.destroy();
  });
});
