import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherLocation } from '@platform/weather/weather-station-lookup.models';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-weather-station-selector',
  templateUrl: './weather-station-selector.component.html',
  styleUrls: ['./weather-station-selector.component.css'],
  standalone: true,
  imports: [CommonModule, IconComponent]
})
export class WeatherStationSelectorComponent implements OnChanges {
  private readonly stationLookup = inject(WeatherStationLookupService);
  private lookupToken = 0;

  @Input() selectedStationId: string | undefined;
  @Input() selectedStationName: string | undefined;
  @Input() initialSearch = '';
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSearch'] && !this.query()) this.query.set(this.initialSearch || '');
    if (changes['selectedStationId']) void this.verifyCurrentStation();
  }

  setQuery(value: string): void { this.query.set(value); }

  async search(): Promise<void> {
    const query = this.query().trim();
    if (!query || this.disabled) return;
    const token = ++this.lookupToken;
    this.searchingLocations.set(true);
    this.locationSearchComplete.set(false);
    this.error.set(undefined);
    this.locations.set([]);
    this.stations.set([]);
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

  selectStation(station: WeatherStation): void {
    if (!this.disabled) {
      this.currentStationUnavailable.set(false);
      this.stationSelected.emit(station);
    }
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

function sortLocations(locations: readonly WeatherLocation[]): WeatherLocation[] {
  return [...locations].sort((first, second) => {
    const firstUs = first.display_name.includes('United States') ? 0 : 1;
    const secondUs = second.display_name.includes('United States') ? 0 : 1;
    return firstUs - secondUs || first.display_name.localeCompare(second.display_name);
  });
}
