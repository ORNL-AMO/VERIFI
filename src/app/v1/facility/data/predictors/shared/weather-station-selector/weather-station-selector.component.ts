import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherLocation } from '@platform/weather/weather-station-lookup.models';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import {
  WeatherPredictorDefinition,
  WeatherStationSelectionPreview
} from '../../models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';

@Component({
  selector: 'app-weather-station-selector',
  templateUrl: './weather-station-selector.component.html',
  styleUrls: ['./weather-station-selector.component.css'],
  standalone: true,
  imports: [CommonModule, EChartsChartDirective, IconComponent, WorkspaceSlideoutComponent]
})
export class WeatherStationSelectorComponent implements OnChanges {
  private readonly stationLookup = inject(WeatherStationLookupService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly workflow = inject(PredictorWeatherWorkflowService);
  private lookupToken = 0;

  @ViewChild('selectorToggle') private readonly selectorToggle?: ElementRef<HTMLButtonElement>;

  @Input() selectedStationId: string | undefined;
  @Input() selectedStationName: string | undefined;
  @Input() initialSearch = '';
  @Input() previewRange: WeatherMonthRange | undefined;
  @Input() previewDefinitions: readonly WeatherPredictorDefinition[] = [];
  @Input() disabled = false;
  @Output() stationSelected = new EventEmitter<WeatherStation>();

  readonly query = signal('');
  readonly locations = signal<readonly WeatherLocation[]>([]);
  readonly stations = signal<readonly WeatherStation[]>([]);
  readonly selectedLocation = signal<WeatherLocation | undefined>(undefined);
  readonly searchingLocations = signal(false);
  readonly locationSearchComplete = signal(false);
  readonly searchingStations = signal(false);
  readonly checkingCurrentStation = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly currentStationUnavailable = signal(false);
  readonly selectorOpen = signal(false);
  readonly candidateStation = signal<WeatherStation | undefined>(undefined);
  readonly stationPreview = signal<WeatherStationSelectionPreview | undefined>(undefined);
  readonly previewChartOption = computed<V1EChartsOption | undefined>(() => {
    const preview = this.stationPreview();
    return preview ? buildStationPreviewChartOption(preview) : undefined;
  });
  readonly gapSummary = computed(() => {
    const count = this.stationPreview()?.warningMonths.length ?? 0;
    if (count === 0) return 'There are no months with gaps in the data.';
    if (count === 1) return 'There is 1 month with gaps in the data.';
    return `There are ${count} months with gaps in the data.`;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSearch'] && !this.query()) this.query.set(this.initialSearch || '');
    if (changes['selectedStationId']) void this.verifyCurrentStation();
  }

  setQuery(value: string): void { this.query.set(value); }

  openSelector(): void {
    if (!this.disabled) this.selectorOpen.set(true);
  }

  closeSelector(): void {
    this.lookupToken++;
    this.workflow.reset();
    this.searchingLocations.set(false);
    this.searchingStations.set(false);
    this.candidateStation.set(undefined);
    this.stationPreview.set(undefined);
    this.selectorOpen.set(false);
    afterNextRender(() => {
      if (this.selectorToggle) this.focusMonitor.focusVia(this.selectorToggle, 'program');
    }, { injector: this.injector });
  }

  async search(): Promise<void> {
    const query = this.query().trim();
    if (!query || this.disabled) return;
    const token = ++this.lookupToken;
    this.searchingLocations.set(true);
    this.locationSearchComplete.set(false);
    this.error.set(undefined);
    this.locations.set([]);
    this.stations.set([]);
    this.selectedLocation.set(undefined);
    this.candidateStation.set(undefined);
    this.stationPreview.set(undefined);
    this.workflow.reset();
    try {
      const locations = await this.stationLookup.searchLocations(query);
      if (token === this.lookupToken) {
        this.locations.set(sortLocations(locations));
        this.locationSearchComplete.set(true);
      }
    } catch {
      if (token === this.lookupToken) this.error.set('Locations could not be loaded. Check the search and try again.');
    } finally {
      if (token === this.lookupToken) this.searchingLocations.set(false);
    }
  }

  async chooseLocation(location: WeatherLocation): Promise<void> {
    if (this.disabled) return;
    const token = ++this.lookupToken;
    this.selectedLocation.set(location);
    this.searchingStations.set(true);
    this.error.set(undefined);
    this.stations.set([]);
    this.candidateStation.set(undefined);
    this.stationPreview.set(undefined);
    this.workflow.reset();
    try {
      const stations = await this.stationLookup.findStations({
        latitude: Number(location.lat), longitude: Number(location.lon)
      });
      if (token === this.lookupToken) {
        this.stations.set([...stations].sort((first, second) => first.distanceFrom - second.distanceFrom));
      }
    } catch {
      if (token === this.lookupToken) this.error.set('Weather stations could not be loaded. Try this location again.');
    } finally {
      if (token === this.lookupToken) this.searchingStations.set(false);
    }
  }

  async selectStation(station: WeatherStation): Promise<void> {
    if (this.disabled) return;
    const range = this.previewRange;
    if (!range) {
      this.error.set('Enter a valid start and end month before selecting a station.');
      return;
    }
    if (this.previewDefinitions.length === 0) {
      this.error.set('Add at least one weather predictor before selecting a station.');
      return;
    }
    const token = ++this.lookupToken;
    this.error.set(undefined);
    this.candidateStation.set(station);
    this.stationPreview.set(undefined);
    const preview = await this.workflow.previewStationSelection(station, range, this.previewDefinitions);
    if (token === this.lookupToken && this.candidateStation()?.ID === station.ID && preview) {
      this.stationPreview.set(preview);
    }
  }

  async retryStationPreview(): Promise<void> {
    const station = this.candidateStation();
    if (station) await this.selectStation(station);
  }

  changeStation(): void {
    if (this.workflow.busy()) return;
    this.lookupToken++;
    this.workflow.reset();
    this.candidateStation.set(undefined);
    this.stationPreview.set(undefined);
    this.error.set(undefined);
  }

  confirmStation(): void {
    const station = this.candidateStation();
    if (!station || !this.stationPreview() || this.disabled) return;
    this.currentStationUnavailable.set(false);
    this.stationSelected.emit(station);
    this.closeSelector();
  }

  changeLocation(): void {
    if (this.disabled || this.searchingStations()) return;
    this.selectedLocation.set(undefined);
    this.stations.set([]);
    this.candidateStation.set(undefined);
    this.stationPreview.set(undefined);
    this.workflow.reset();
    this.error.set(undefined);
  }

  private async verifyCurrentStation(): Promise<void> {
    const stationId = this.selectedStationId;
    this.currentStationUnavailable.set(false);
    if (!stationId) return;
    const token = ++this.lookupToken;
    this.checkingCurrentStation.set(true);
    try {
      const station = await this.stationLookup.getStation(stationId);
      if (token === this.lookupToken) this.currentStationUnavailable.set(!station);
    } catch {
      if (token === this.lookupToken) this.currentStationUnavailable.set(true);
    } finally {
      if (token === this.lookupToken) this.checkingCurrentStation.set(false);
    }
  }
}

function buildStationPreviewChartOption(preview: WeatherStationSelectionPreview): V1EChartsOption {
  const pointCount = preview.series[0]?.points.length ?? 0;
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 'center', type: 'scroll' },
    grid: { top: 58, right: 24, bottom: pointCount > 12 ? 72 : 38, left: 58, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: value => new Date(Number(value)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) }
    },
    yAxis: { type: 'value', name: 'Monthly value' },
    dataZoom: pointCount > 12
      ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100, bottom: 14, height: 24 }]
      : [],
    series: preview.series.map(series => ({
      name: `${series.name} (${series.unit})`,
      type: 'line',
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 7,
      connectNulls: false,
      data: series.points.map(point => ({
        name: point.monthLabel,
        value: [Date.UTC(point.month.year, point.month.month - 1, 1), Number.isFinite(point.amount) ? point.amount : null],
        symbol: point.warning ? 'emptyCircle' : 'circle',
        symbolSize: point.warning ? 11 : 7,
        itemStyle: point.warning ? { color: 'var(--v1-warning)', borderWidth: 2 } : undefined
      }))
    }))
  } as V1EChartsOption;
}

function sortLocations(locations: readonly WeatherLocation[]): WeatherLocation[] {
  return [...locations].sort((first, second) => {
    const firstUs = first.display_name.includes('United States') ? 0 : 1;
    const secondUs = second.display_name.includes('United States') ? 0 : 1;
    return firstUs - secondUs || first.display_name.localeCompare(second.display_name);
  });
}
