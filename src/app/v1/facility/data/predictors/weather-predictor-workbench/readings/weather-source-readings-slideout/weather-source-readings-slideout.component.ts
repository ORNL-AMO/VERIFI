import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import {
  HourlyWeatherReading,
  WeatherDataParameter,
  WeatherMonth
} from '@platform/weather/hourly-weather-data.models';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

const SOURCE_GAP_THRESHOLD_MILLISECONDS = 12 * 60 * 60 * 1000;

export interface WeatherSourceReadingPoint {
  readonly time: Date;
  readonly value: number | null;
}

export interface WeatherSourceGapRange {
  readonly start: Date;
  readonly end: Date;
}

export interface WeatherSourceReadingChart {
  readonly sourceLabel: string;
  readonly unit: string;
  readonly points: readonly WeatherSourceReadingPoint[];
  readonly gaps: readonly WeatherSourceGapRange[];
  readonly readingCount: number;
  readonly missingValueCount: number;
}

@Component({
  selector: 'app-weather-source-readings-slideout',
  templateUrl: './weather-source-readings-slideout.component.html',
  styleUrls: ['./weather-source-readings-slideout.component.css'],
  standalone: true,
  imports: [CommonModule, EChartsChartDirective, IconComponent, WorkspaceSlideoutComponent]
})
export class WeatherSourceReadingsSlideoutComponent implements OnChanges, OnDestroy {
  private readonly hourlyWeather = inject(HourlyWeatherDataService);
  private readonly cancelLoad = new Subject<void>();
  private loadRequest = 0;

  @Input({ required: true }) predictor!: IdbPredictor;
  @Input({ required: true }) month!: WeatherMonth;
  @Input({ required: true }) monthLabel = '';
  @Output() readonly closed = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly chart = signal<WeatherSourceReadingChart | undefined>(undefined);
  readonly chartOption = computed<V1EChartsOption | undefined>(() => {
    const chart = this.chart();
    return chart ? buildWeatherSourceReadingChartOption(chart) : undefined;
  });
  readonly summary = computed(() => {
    const chart = this.chart();
    if (!chart) return '';
    const gapText = chart.gaps.length === 1
      ? '1 gap longer than 12 hours'
      : `${chart.gaps.length} gaps longer than 12 hours`;
    const missingText = chart.missingValueCount === 1
      ? '1 missing source value'
      : `${chart.missingValueCount} missing source values`;
    return `${gapText} and ${missingText} were found in ${chart.readingCount} source readings.`;
  });

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.loadRequest++;
    this.cancelLoad.next();
    this.cancelLoad.complete();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const request = ++this.loadRequest;
    this.cancelLoad.next();
    const stationId = this.predictor?.weatherStationId?.trim();
    if (!stationId || !this.month) {
      this.chart.set(undefined);
      this.loading.set(false);
      this.error.set('The source readings are unavailable because this predictor does not have a saved weather station.');
      return;
    }
    this.loading.set(true);
    this.error.set(undefined);
    this.chart.set(undefined);
    try {
      const readings = await firstValueFrom(this.hourlyWeather.load({
        stationId,
        range: { start: this.month, end: this.month }
      }).pipe(takeUntil(this.cancelLoad)), { defaultValue: undefined });
      if (request !== this.loadRequest || !readings) return;
      this.chart.set(buildWeatherSourceReadingChart(this.predictor, this.month, readings));
    } catch {
      if (request === this.loadRequest) {
        this.error.set('The hourly source readings could not be loaded. Try again.');
      }
    } finally {
      if (request === this.loadRequest) this.loading.set(false);
    }
  }
}

export function buildWeatherSourceReadingChart(
  predictor: Pick<IdbPredictor, 'weatherDataType'>,
  month: WeatherMonth,
  readings: readonly HourlyWeatherReading[]
): WeatherSourceReadingChart {
  const source = weatherSourceMetric(predictor.weatherDataType);
  const monthStart = new Date(month.year, month.month - 1, 1);
  const monthEnd = new Date(month.year, month.month, 1);
  const monthReadings = readings
    .map(reading => ({ ...reading, time: new Date(reading.time) }))
    .filter(reading => !Number.isNaN(reading.time.getTime())
      && reading.time >= monthStart && reading.time < monthEnd)
    .sort((first, second) => first.time.getTime() - second.time.getTime());
  const calculationReadings = monthReadings.filter(reading => finiteWeatherValue(reading.dry_bulb_temp) !== null);
  const points = monthReadings.map(reading => ({
    time: reading.time,
    value: finiteWeatherValue(reading.dry_bulb_temp) === null
      ? null
      : finiteWeatherValue(reading[source.parameter])
  }));
  return {
    sourceLabel: source.label,
    unit: source.unit,
    points,
    gaps: findWeatherSourceGaps(calculationReadings, monthStart, monthEnd),
    readingCount: monthReadings.length,
    missingValueCount: points.filter(point => point.value === null).length
  };
}

export function buildWeatherSourceReadingChartOption(chart: WeatherSourceReadingChart): V1EChartsOption {
  const hasZoom = chart.points.length > 100;
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 28, right: 24, bottom: hasZoom ? 72 : 38, left: 58, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: value => new Date(Number(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    },
    yAxis: { type: 'value', name: `${chart.sourceLabel} (${chart.unit})` },
    dataZoom: hasZoom
      ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100, bottom: 14, height: 24 }]
      : [],
    series: [{
      name: `${chart.sourceLabel} (${chart.unit})`,
      type: 'line',
      showSymbol: chart.points.length <= 100,
      symbol: 'circle',
      symbolSize: 5,
      connectNulls: false,
      data: chart.points.map(point => [point.time.getTime(), point.value]),
      markArea: chart.gaps.length > 0 ? {
        silent: true,
        itemStyle: { color: 'var(--v1-warning)', opacity: 0.14 },
        data: chart.gaps.map(gap => [{ xAxis: gap.start.getTime() }, { xAxis: gap.end.getTime() }])
      } : undefined
    }]
  } as V1EChartsOption;
}

function findWeatherSourceGaps(
  readings: readonly HourlyWeatherReading[],
  monthStart: Date,
  monthEnd: Date
): WeatherSourceGapRange[] {
  if (readings.length === 0) return [{ start: monthStart, end: monthEnd }];
  const gaps: WeatherSourceGapRange[] = [];
  let previous = monthStart;
  for (const reading of readings) {
    if (reading.time.getTime() - previous.getTime() > SOURCE_GAP_THRESHOLD_MILLISECONDS) {
      gaps.push({ start: previous, end: reading.time });
    }
    previous = reading.time;
  }
  if (monthEnd.getTime() - previous.getTime() > SOURCE_GAP_THRESHOLD_MILLISECONDS) {
    gaps.push({ start: previous, end: monthEnd });
  }
  return gaps;
}

function weatherSourceMetric(type: WeatherDataType): {
  readonly parameter: WeatherDataParameter;
  readonly label: string;
  readonly unit: string;
} {
  const metrics: Record<WeatherDataType, { parameter: WeatherDataParameter; label: string; unit: string }> = {
    HDD: { parameter: 'dry_bulb_temp', label: 'Dry bulb temperature', unit: '°F' },
    CDD: { parameter: 'dry_bulb_temp', label: 'Dry bulb temperature', unit: '°F' },
    relativeHumidity: { parameter: 'humidity', label: 'Relative humidity', unit: '%' },
    dryBulbTemp: { parameter: 'dry_bulb_temp', label: 'Dry bulb temperature', unit: '°F' },
    wetBulbTemp: { parameter: 'wet_bulb_temp', label: 'Wet bulb temperature', unit: '°F' },
    dewPointTemp: { parameter: 'dew_point_temp', label: 'Dew point temperature', unit: '°F' },
    precipitation: { parameter: 'precipitation', label: 'Precipitation', unit: 'in' }
  };
  return metrics[type] ?? metrics.dryBulbTemp;
}

function finiteWeatherValue(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
