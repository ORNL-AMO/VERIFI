export interface WeatherLocation {
  readonly addresstype: string;
  readonly display_name: string;
  readonly lat: string;
  readonly lon: string;
  readonly place_id: number;
}

export interface WeatherStationCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface WeatherStationResponse {
  readonly station_id: string;
  readonly name: string;
  readonly data_begin_date: string;
  readonly data_end_date: string;
  readonly distance: number;
  readonly rating_percent: number;
  readonly lat: string;
  readonly lon: string;
  readonly state?: string;
}
