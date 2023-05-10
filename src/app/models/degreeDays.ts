
export interface WeatherStation {
    name: string,
    country: string,
    state: string,
    lat: string,
    lon: string,
    begin: Date,
    end: Date,
    USAF: string,
    WBAN: string,
    ID: string,
    distanceFrom: number
}

export interface LocalClimatologicalData {
    stationId: string,
    STATION: string,
    DATE: Date,
    LATITUDE: string,
    LONGITUDE: string,
    ELEVATION: string,
    NAME: string,
    REPORT_TYPE: string,
    SOURCE: string,
    HourlyAltimeterSetting: number,
    HourlyDewPointTemperature: number,
    HourlyDryBulbTemperature: number,
    HourlyPrecipitation: number,
    HourlyPresentWeatherType: string,
    HourlyPressureChange: number,
    HourlyPressureTendency: number,
    HourlyRelativeHumidity: number,
    HourlySkyConditions: number,
    HourlySeaLevelPressure: number,
    HourlyStationPressure: number,
    HourlyVisibility: number,
    HourlyWetBulbTemperature: number,
    HourlyWindDirection: number,
    HourlyWindGustSpeed: number,
    HourlyWindSpeed: number
}

// export interface DegreeDay {
//     heatingDegreeDays: number,
//     coolingDegreeDays: number,
//     date: Date,
//     stationId: string,
//     stationName: string,
//     hasErrors: boolean
// }

export interface DetailDegreeDay {
    time: Date,
    heatingDegreeDay: number,
    coolingDegreeDay: number,
    dryBulbTemp: number,
    percentOfDay: number,
    heatingDegreeDifference: number,
    coolingDegreeDifference: number,
    lagDryBulbTemp: number,
    stationId: string,
    stationName: string,
    gapInData: boolean
}

export type WeatherDataSelection = 'degreeDays' | 'CDD' | 'HDD';

export interface WeatherDataSelectionOption {
    selection: WeatherDataSelection,
    label: string
}

export const WeatherDataSelectionOptions: Array<WeatherDataSelectionOption> = [
    {
        selection: 'degreeDays',
        label: 'Both Degree Days'
    },
    {
        selection: 'CDD',
        label: 'Cooling Degree Days'
    },
    {
        selection: 'HDD',
        label: 'Heating Degree Days'
    }
]